#!/bin/sh

# cols=1024 means table rows will fit on one line
# graph means table borders will be drawn (seems to work without as well)
# -o display_borders=TRUE means html tables will be drawn with borders, without need for CSS
# dump means print to file, rather than open interactive browser
# first sed isolates data in the first table
# second sed replaces cell boundary characters and surrounding whitespace with a tab character (commas appear in some fields)
# awk isolates those lines which contain tabs, and then separates line by tabs, then prints the desired fields:
# there are also checks in case the join date or year founded are non-standard.  If empty, assume joined March 4 1957, and founded 1957
#
#   $2    $3    $5              $7             $8         $10
# symbol name sector headquarters_location date_added year_founded

w3m -cols 1024 -graph -o display_borders=TRUE -dump https://en.wikipedia.org/wiki/List_of_S%26P_500_companies | \
    sed -n '/Headquarters Location/,/└/p' | \
    sed 's/ *│ */	/g;' | \
    awk -F '	' '/	/{ FS=OFS="	";
        if ($8=="") split("1957-03-04",a,/ /);
        else split($8,a,/ /);
        if ($10=="") split("1957",b,/ /);
        else split($10,b,/[ \/]/);
        print $2,$3,$5,$7,a[1],b[1] }'
