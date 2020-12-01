#!/usr/bin/env python3

import sys
import psycopg2
import config


SECTOR_TABLE = 'sectors'
HEADQUARTERS_TABLE = 'headquarters_locations'
COMPANY_TABLE = 'companies'


def get_sector_id_dict():
    query = f'SELECT sector_name, id FROM {SECTOR_TABLE}'
    cursor = connect_to_database()
    cursor.execute(query)

    sector_dict = {}
    for entry in cursor:
        sector_dict[entry[0]] = int(entry[1])
    return sector_dict


def get_headquarters_id_dict():
    query = f'SELECT location, id FROM {HEADQUARTERS_TABLE}'
    cursor = connect_to_database()
    cursor.execute(query)

    headquarters_dict = {}
    for entry in cursor:
        headquarters_dict[entry[0]] = int(entry[1])
    return headquarters_dict


def connect_helper(user, error_message_list):
    try:
        connection = psycopg2.connect(database=config.database, user=user)
        cursor = connection.cursor()
        return cursor
    except Exception as e:
        error_message_list.append(e)
    return None


def connect_to_database():
    error_message_list = []
    try:
        config.user
        cursor = connect_helper(config.user, error_mesage_list)
        if cursor is not None:
            return cursor
    except AttributeError:
        for user in config.user_list:
            cursor = connect_helper(user, error_message_list)
            if cursor is not None:
                return cursor

    # prints and exits if none of the users in user_list owns the database
    for error_message in error_message_list:
        print(error_message)
    exit()


def dollars_to_cents(value):
    return int(float(value) * 100 + 0.5)


def main():
    sector_dict = get_sector_id_dict()
    headquarters_dict = get_headquarters_id_dict()
    files = [sys.stdin]
    if len(sys.argv) > 1:
        files = [open(f) for f in sys.argv[1:]]
    # symbol, name, sector, headquarters, date added, year founded
    symbol_col = 1
    sector_col = 2
    headquarters_col = 3
    date_added_col = 4
    existing_companies = set()
    for infile in files:
        for line in infile:
            if 'gics sector' in line.lower():
                continue
            components = line.strip().split('\t')
            if components[symbol_col] in existing_companies:
                continue
            existing_companies.add(components[symbol_col])
            components[sector_col] = sector_dict[components[sector_col]]
            components[headquarters_col] = headquarters_dict[components[headquarters_col]]
            date_added = components[date_added_col]
            if date_added.count('-') != 2 and len(date_added) == 4:
                date_added = date_added + '-01-01'
            components[date_added_col] = date_added
            try:    # need this in case, for example, `head` is used, which closes the pipe after a few lines
                print('\t'.join([str(component) for component in components]))
            except BrokenPipeError:
                sys.exit(0)


if __name__ == '__main__':
    main()

