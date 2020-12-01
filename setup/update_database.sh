#!/bin/bash

# Need bash for array indexing, which is not included in POSIX shell

# Database name
DB_NAME="stocks"
if [ -f config.py ]; then
    DB_NAME="$(grep "database" config.py | sed "s/.*= *//g; s/'//g")"
fi

# Sufficiently unique ID
ID="$(date +%s)"

# Create and drop an empty database to make sure postgres is properly configured
createdb "test_db_$ID" || exit 1
dropdb "test_db_$ID"

# Create the stocks database, if it does not yet exist
createdb "$DB_NAME" 2>/dev/null

# Database table names
COMPANY_TABLE="companies"
SECTOR_TABLE="sectors"
HEADQUARTERS_TABLE="headquarters_locations"
STOCK_TABLE="daily_stock_values"

# Store current working directory for absolute path
CWD="$(pwd)"

# Data directory
DATA_DIR="$CWD/../data"

# File storing company data
COMPANY_DATA="$DATA_DIR/company_data.tsv"
SECTORS="$DATA_DIR/sectors.tsv"
HEADQUARTERS="$DATA_DIR/headquarters_locations.tsv"

# Stocks directory
STOCKS="$DATA_DIR/stocks"

# File storing complete stock data
DATA="$DATA_DIR/stock_data.csv"

# Temporary directories
TMP_STOCKS="/tmp/$ID-stocks"

# Temporary data files
TMP_DATA="/tmp/$ID-tmp_data.csv"
NEW_DATA="/tmp/$ID-data.csv"
TMP_DIFF="/tmp/$ID-diff.csv"

# Temporary files storing entries to insert and delete from database
TMP_INSERT="/tmp/$ID-insert.csv"
TMP_DELETE="/tmp/$ID-delete.csv"
TMP_INSERT_CLEANED="/tmp/$ID-insert_cleaned.csv"

# Temporary copy of company data, to see if there are changes
TMP_COMPANY_DATA="/tmp/$ID-company_data.tsv"
TMP_COMPANY_DATA_CLEANED="/tmp/$ID-company_data_cleaned.tsv"

echo "Getting updated company data..."
# Pull company data, store in data/
sh get_company_data.sh > "$TMP_COMPANY_DATA"
echo "    done."

# Make company data file, if it does not already exist, so that it can be diffed
mkdir -p "$DATA_DIR"
touch "$COMPANY_DATA"

echo

echo "Checking if companies table exists and company data is unchanged..."
# If company data differs from what was there before (or there is no previous data),
# then purge the entire database and rebuild the companies table
{ psql -c '\dt' "$DB_NAME" 2>/dev/null | grep "$COMPANY_TABLE" > /dev/null && diff "$COMPANY_DATA" "$TMP_COMPANY_DATA" > /dev/null && echo "    true." && echo "Using existing companies table."; } || {
    echo "    false."
    echo "Thus, will rebuild all tables so that IDs match between sectors, headquarters,"
    echo "companies, and stock data."
    echo
    echo "Extracting sector and headquarters data from new company data..."
    python3 get_sectors.py "$TMP_COMPANY_DATA" > "$SECTORS"
    python3 get_headquarters.py "$TMP_COMPANY_DATA" > "$HEADQUARTERS"
    echo "    done."
    echo
    echo "Rebuilding sectors and headquarters tables..."
    psql -c "DROP TABLE IF EXISTS $SECTOR_TABLE;" "$DB_NAME"
    psql -c "CREATE TABLE $SECTOR_TABLE ( id INT, sector_name TEXT );" "$DB_NAME"
    psql -c "COPY $SECTOR_TABLE ( id, sector_name ) FROM '$SECTORS';" "$DB_NAME"
    psql -c "DROP TABLE IF EXISTS $HEADQUARTERS_TABLE;" "$DB_NAME"
    psql -c "CREATE TABLE $HEADQUARTERS_TABLE ( id INT, location TEXT );" "$DB_NAME"
    psql -c "COPY $HEADQUARTERS_TABLE ( id, location ) FROM '$HEADQUARTERS';" "$DB_NAME"
    echo "    done."
    echo
    echo "Preparing company data for insertion into companies table..."
    python3 clean_company_data.py "$TMP_COMPANY_DATA" > "$TMP_COMPANY_DATA_CLEANED"
    echo "    done."
    echo
    echo "Rebuilding companies table, and deleting old stocks data as well so that"
    echo "it can be rebuilt later to match the new company IDs."
    psql -c "DROP TABLE IF EXISTS $COMPANY_TABLE;" "$DB_NAME"
    psql -c "CREATE TABLE $COMPANY_TABLE ( id SERIAL, symbol TEXT, full_name TEXT, sector_id INT, headquarters_location_id INT, date_first_added DATE, founded_year INT );" "$DB_NAME"
    rm "$DATA" 2>/dev/null
    psql -c "DROP TABLE IF EXISTS $STOCK_TABLE;" "$DB_NAME"
    psql -c "COPY $COMPANY_TABLE ( symbol, full_name, sector_id, headquarters_location_id, date_first_added, founded_year ) FROM '$TMP_COMPANY_DATA_CLEANED';" "$DB_NAME"
    rm "$TMP_COMPANY_DATA_CLEANED"
    mv "$TMP_COMPANY_DATA" "$COMPANY_DATA"
}

echo

echo "Checking whether stocks data file and stocks table exist..."
# If $DATA csv file does not exist, then drop stock table, if the table
# exists (we may have just dropped it, which is fine), and re-create it
[ -f "$DATA" ] && psql -c '\dt' "$DB_NAME" 2>/dev/null | grep "$COMPANY_TABLE" > /dev/null && {
    echo "    true."
    echo "New stocks data will be added to existing stocks table."
} || {
    echo "    false."
    echo "Dropping and re-creating stocks table, to be populated soon."
    rm "$DATA" 2>/dev/null
    psql -c "DROP TABLE IF EXISTS $STOCK_TABLE;" "$DB_NAME"
    psql -c "CREATE TABLE $STOCK_TABLE ( company_id INT, date DATE, open NUMERIC, high NUMERIC, low NUMERIC, close NUMERIC, volume NUMERIC );" "$DB_NAME"
}

COMPANIES="$(awk -F '	' '{print $1}' "$COMPANY_DATA")"

# Make temp directories for stocks data
mkdir -p "$TMP_STOCKS"

echo

echo "Downloading new stocks data..."
# Download company stocks to $TMP_STOCKS
echo "$COMPANIES" | python3 get_stocks.py - -o "$TMP_STOCKS"
echo "    done."

echo

echo "Merging and sorting stocks data..."
sort -r $TMP_STOCKS/* > "$TMP_DATA" # sort doesn't like $TMP_STOCKS/* to be inside ""
head -1 "$TMP_DATA" > "$NEW_DATA"
grep -iv "date,high,low" "$TMP_DATA" >> "$NEW_DATA"
rm -r "$TMP_STOCKS"
rm "$TMP_DATA"
echo "   done."

# Make files to store changes which need to be inserted or deleted from the stocks table
touch "$TMP_INSERT" "$TMP_DELETE"

echo

echo "Running diff on new data to extract changes to be inserted or removed from stocks table..."
touch "$DATA"
diff --suppress-common-lines "$DATA" "$NEW_DATA" | grep -iv "date,high,low" > "$TMP_DIFF"
grep '> ' "$TMP_DIFF" | sed 's/> //g' > "$TMP_INSERT"
grep '< ' "$TMP_DIFF" | sed 's/< //g' > "$TMP_DELETE"
rm "$TMP_DIFF"
echo "    done."

echo

if [ "$(cat "$TMP_DELETE" | wc -l)" -gt 0 ]; then   # use cat so that filename is not in output
    echo "Stocks need to be deleted, so it's easier to just rebuild the table."
    psql -c "DROP TABLE IF EXISTS $STOCK_TABLE;" "$DB_NAME"
    psql -c "CREATE TABLE $STOCK_TABLE ( company_id INT, date DATE, open NUMERIC, high NUMERIC, low NUMERIC, close NUMERIC, volume NUMERIC );" "$DB_NAME"
    rm "$TMP_INSERT"
    ln "$NEW_DATA" "$TMP_INSERT"
else
    echo "No stocks need to be deleted."
fi

rm "$TMP_DELETE"

echo "Preparing new stocks data to be added to the tablet..."
python3 clean_stock_data.py "$TMP_INSERT" > "$TMP_INSERT_CLEANED"
rm "$TMP_INSERT"
echo "    done."

echo

echo "Copying new stocks data into stocks table..."
# Copy the to-insert csv into the stock table
psql -c "COPY $STOCK_TABLE ( company_id, date, open, high, low, close, volume ) FROM '$TMP_INSERT_CLEANED' WITH CSV NULL as 'NULL';" "$DB_NAME"
echo "    done."
echo "Total rows added: $(cat "$TMP_INSERT_CLEANED" | wc -l)"   # use cat so that filename is not in output
rm "$TMP_INSERT_CLEANED"

echo

# Delete old stock data and move new stock data there, so the database matches the stock data exactly
mv "$NEW_DATA" "$DATA"

