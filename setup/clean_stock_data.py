#!/usr/bin/env python3

import sys
import psycopg2
import config


COMPANY_TABLE = 'companies'


def get_stock_id_dict():
    query = f'SELECT symbol, id FROM {COMPANY_TABLE}'
    cursor = connect_to_database()
    cursor.execute(query)

    symbol_dict = {}
    for entry in cursor:
        symbol_dict[entry[0]] = int(entry[1])
    return symbol_dict


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
    symbol_dict = get_stock_id_dict()
    files = [sys.stdin]
    if len(sys.argv) > 1:
        files = [open(f) for f in sys.argv[1:]]
    symbol_col = 7
    date_col = 0
    open_col = 3
    high_col = 1
    low_col = 2
    close_col = 4    
    volume_col = 5
    for infile in files:
        for line in infile:
            if 'date,high,low' in line.lower():
                continue
            components = line.strip().split(',')
            out_line = [symbol_dict[components[symbol_col]], components[date_col]]
            for col in [open_col, high_col, low_col, close_col]:
                out_line.append(dollars_to_cents(components[col]))
            out_line.append(int(float(components[volume_col])))
            try:    # need this in case, for example, `head` is used, which closes the pipe after a few lines
                print(','.join([str(item) for item in out_line]))
            except BrokenPipeError:
                sys.exit(0)


if __name__ == '__main__':
    main()
