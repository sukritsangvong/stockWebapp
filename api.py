'''
    api.py
    Oliver Calder and PJ Sangvong
    Fall 2020
'''
import sys
import os
import datetime
import flask
import json
import config
import psycopg2
import time
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

STOCK_TABLE = 'daily_stock_values'
COMPANY_TABLE = 'companies'
SECTOR_TABLE = 'sectors'
HEADQUARTERS_TABLE = 'headquarters_locations'

api = flask.Blueprint('api', __name__)


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


def get_most_recent_date():
    query = f'''SELECT MAX(date) FROM {STOCK_TABLE};'''
    cursor = connect_to_database()
    cursor.execute(query)

    for row in cursor:
        return str(row[0])


def get_active_company_ids():
    query = f'''SELECT DISTINCT {STOCK_TABLE}.company_id FROM {STOCK_TABLE}'''
    cursor = connect_to_database()
    cursor.execute(query)
    company_ids = set()

    for row in cursor:
        company_ids.add(row[0])

    return company_ids


def get_stock_most_recent_value(company_id):
    query = f'''SELECT MAX({STOCK_TABLE}.date)
    AS date
    FROM {STOCK_TABLE}
    WHERE {STOCK_TABLE}.company_id = %s;'''
    cursor = connect_to_database()
    cursor.execute(query, (company_id,))

    for row in cursor:
        date = row[0]

    query = f'''SELECT {STOCK_TABLE}.close
    FROM {STOCK_TABLE}
    WHERE {STOCK_TABLE}.date = %s
    AND {STOCK_TABLE}.company_id = %s;'''
    cursor.execute(query, (date, company_id))

    for row in cursor:
        return float(row[0]) / 100


def get_current_value_dict(active_company_ids=None):
    most_recent_date = get_most_recent_date()
    cursor = connect_to_database()
    query = f'''SELECT {STOCK_TABLE}.company_id, {STOCK_TABLE}.close, {STOCK_TABLE}.open
    FROM {STOCK_TABLE}
    WHERE {STOCK_TABLE}.date = %s;'''
    
    cursor.execute(query, (most_recent_date,))
    current_value_dict = {}
    for row in cursor:
        company_id = row[0]
        close_value = float(row[1]) / 100
        open_value = float(row[2]) / 100

        if close_value:
            current_value_dict[company_id] = close_value
        elif company_id not in current_value_dict:
            current_value_dict[company_id] = open_value

    if active_company_ids:
        for company_id in active_company_ids:
            if company_id not in current_value_dict:
                current_value_dict[company_id] = get_stock_most_recent_value(company_id)
    return current_value_dict


def get_all_time_high_dict():
    query = f'''SELECT MAX({STOCK_TABLE}.high)
    AS high, company_id
    FROM {STOCK_TABLE}
    GROUP BY {STOCK_TABLE}.company_id;'''

    cursor = connect_to_database()
    cursor.execute(query)

    all_time_high_dict = {}
    for row in cursor:
        company_id = row[1]
        value = float(row[0]) / 100
        all_time_high_dict[company_id] = value
    return all_time_high_dict


@api.route('/stock_data/<stock_symbol>')
def get_stock_data(stock_symbol):
    query_args = []
    query = f'''SELECT {COMPANY_TABLE}.symbol, {STOCK_TABLE}.date, {STOCK_TABLE}.open, {STOCK_TABLE}.high, {STOCK_TABLE}.low, {STOCK_TABLE}.close, {STOCK_TABLE}.volume
    FROM {COMPANY_TABLE}, {STOCK_TABLE}
    WHERE {COMPANY_TABLE}.symbol = %s
    AND {COMPANY_TABLE}.id = {STOCK_TABLE}.company_id'''

    query_args.append(stock_symbol)

    start_date = flask.request.args.get('start_date')
    if start_date is not None:
        query += f''' AND {STOCK_TABLE}.date >= %s'''
        query_args.append(start_date)

    end_date = flask.request.args.get('end_date')
    if end_date is not None:
        query += f''' AND {STOCK_TABLE}.date <= %s'''
        query_args.append(end_date)

    query += f''' ORDER BY {STOCK_TABLE}.date;'''

    cursor = connect_to_database()
    cursor.execute(query, query_args)

    daily_stock_values = []

    for row in cursor:
        symbol, date, open_val, high_val, low_val, close_val, volume = row
        daily_stock_values.append({
            'symbol': symbol,
            'date': str(date),
            'open': str(float(open_val) / 100),
            'high': str(float(high_val) / 100),
            'low': str(float(low_val) / 100),
            'close': str(float(close_val) / 100),
            'volume': int(volume)
            })
    return json.dumps(daily_stock_values)


@api.route('/stock_summary/<stock_symbol>')
def get_stock_summary(stock_symbol):
    query_args = []
    query = f'''SELECT {COMPANY_TABLE}.id, {COMPANY_TABLE}.symbol, {COMPANY_TABLE}.full_name, {SECTOR_TABLE}.sector_name, {HEADQUARTERS_TABLE}.location, {COMPANY_TABLE}.date_first_added, {COMPANY_TABLE}.founded_year
    FROM {COMPANY_TABLE}, {SECTOR_TABLE}, {HEADQUARTERS_TABLE}
    WHERE symbol = %s
    AND {COMPANY_TABLE}.sector_id = {SECTOR_TABLE}.id
    AND {COMPANY_TABLE}.headquarters_location_id = {HEADQUARTERS_TABLE}.id;'''
    query_args.append(stock_symbol)
    cursor = connect_to_database()
    cursor.execute(query, query_args)

    current_value_dict = get_current_value_dict()
    all_time_high_dict = get_all_time_high_dict()

    companies = []
    for company in cursor:
        company_id, symbol, full_name, sector, headquarters_location, date_first_added, founded_year = company
        current_value = current_value_dict[company_id]
        all_time_high = all_time_high_dict[company_id]
        companies.append({
            'symbol': symbol,
            'full_name': full_name,
            'sector': sector,
            'current_value': current_value,
            'all_time_high': all_time_high,
            'headquarters_location': headquarters_location,
            'date_first_added': str(date_first_added),
            'founded_year': founded_year
            })
    return json.dumps(companies)


@api.route('/stock_search/')
def search_stocks():
    search_string = flask.request.args.get('search_string')
    current_value_min = flask.request.args.get('current_value_min')
    current_value_max = flask.request.args.get('current_value_max')
    all_time_high_min = flask.request.args.get('all_time_high_min')
    all_time_high_max = flask.request.args.get('all_time_high_max')
    sector = flask.request.args.get('sector')
    sectors = None
    if sector is not None:
        sectors = sector.split(',')

    query_args = []
    query = f'''SELECT DISTINCT {COMPANY_TABLE}.id, {COMPANY_TABLE}.symbol, {COMPANY_TABLE}.full_name, {SECTOR_TABLE}.sector_name, {HEADQUARTERS_TABLE}.location, {COMPANY_TABLE}.date_first_added, {COMPANY_TABLE}.founded_year
    FROM {COMPANY_TABLE}, {SECTOR_TABLE}, {HEADQUARTERS_TABLE}
    WHERE {COMPANY_TABLE}.sector_id = {SECTOR_TABLE}.id
    AND {COMPANY_TABLE}.headquarters_location_id = {HEADQUARTERS_TABLE}.id'''

    if search_string is not None:
        query += f''' AND (
            {COMPANY_TABLE}.symbol ILIKE %s
            OR {COMPANY_TABLE}.full_name ILIKE %s
        )'''
        query_args.append('%' + search_string.upper() + '%')
        query_args.append('%' + search_string.upper() + '%')

    if sectors is not None:
        query += ''' AND ('''
        for s in sectors:
            query += f''' {SECTOR_TABLE}.sector_name LIKE %s OR'''
            query_args.append('%' + s + '%')
        query = query[:-3] + ')'  # strip off the ' OR'
    query += ';'

    start = time.time()
    cursor = connect_to_database()
    cursor.execute(query, query_args)
    end = time.time()
    print('Time to execute search stocks main query:', end - start)

    start = time.time()
    active_company_ids = get_active_company_ids()
    end = time.time()
    print('Time to get active_company_ids:', end - start)

    start = time.time()
    current_value_dict = get_current_value_dict(active_company_ids)
    end = time.time()
    print('Time to get current value dict:', end - start)

    start = time.time()
    all_time_high_dict = get_all_time_high_dict()
    end = time.time()
    print('Time to get all time high dict:', end - start)

    companies = []
    for company in cursor:
        company_id, symbol, full_name, sector, headquarters_location, date_first_added, founded_year = company

        if company_id not in active_company_ids:
            continue
        current_value = current_value_dict[company_id]
        all_time_high = all_time_high_dict[company_id]
        if current_value_min is not None:
            if current_value < float(current_value_min):
                continue
        if current_value_max is not None:
            if current_value > float(current_value_max):
                continue
        if all_time_high_min is not None:
            if all_time_high < float(all_time_high_min):
                continue
        if all_time_high_max is not None:
            if all_time_high > float(all_time_high_max):
                continue

        companies.append({
            'id': company_id,
            'symbol': symbol,
            'full_name': full_name,
            'sector': sector,
            'current_value': current_value,
            'all_time_high': all_time_high,
            'headquarters_location': headquarters_location,
            'date_first_added': str(date_first_added),
            'founded_year': founded_year
            })
    return json.dumps(companies)


@api.route('/stock_graph/<symbols>.png')
def stock_graph(symbols):
    display_option = flask.request.args.get('display_option')
    date_option = flask.request.args.get('date_option')
    start_date = flask.request.args.get('start_date')
    end_date = flask.request.args.get('end_date')
    width = flask.request.args.get('width')
    height = flask.request.args.get('height')
    
    symbol_list = symbols.split(',')
    if len(symbol_list) == 0:
        return None

    query_args = []
    query = f'''SELECT {COMPANY_TABLE}.symbol, {STOCK_TABLE}.date, {STOCK_TABLE}.open, {STOCK_TABLE}.close, {STOCK_TABLE}.volume
    FROM {COMPANY_TABLE}, {STOCK_TABLE}
    WHERE {COMPANY_TABLE}.id = {STOCK_TABLE}.company_id
    AND ('''

    for symbol in symbol_list:
        query += f''' {COMPANY_TABLE}.symbol = %s OR'''
        query_args.append(symbol)
    query = query[:-3] + ' )'    # remove the final ' OR' and add a closing ')'

    if display_option is not None:
        display_option = display_option.lower().replace('-', '_')
    if display_option not in ['price', 'percent_change', 'volume']:
        display_option = 'price'

    if date_option is not None:
        date_option = date_option.lower()
    if date_option not in ['day', 'week', 'month', '3month', 'year', 'all', 'custom']:
        date_option = 'month'

    start = None
    end = None

    if date_option == 'day':
        end = datetime.date.today()
        start = end - datetime.timedelta(days=1)
    elif date_option == 'week':
        end = datetime.date.today()
        start = end - datetime.timedelta(weeks=1)
    elif date_option == 'month':
        end = datetime.date.today()
        start = end - datetime.timedelta(days=31)
    elif date_option == '3month':
        end = datetime.date.today()
        start = end - datetime.timedelta(weeks=13)
    elif date_option == 'year':
        end = datetime.date.today()
        start = end - datetime.timedelta(days=365)
    elif date_option == 'custom':
        end = datetime.date.today()
        if end_date is not None:
            try:
                end = datetime.date.fromisoformat(end_date).isoformat()
            except ValueError:
                end = datetime.date.today()
        start = datetime.date.fromisoformat('1953-03-04')
        if start_date is not None:
            try:
                start = datetime.date.fromisoformat(start_date).isoformat()
            except ValueError:
                start = datetime.date.fromisoformat('1953-03-04')

    if start is not None:
        query += f''' AND {STOCK_TABLE}.date >= %s'''
        query_args.append(start)
    if end is not None:
        query += f''' AND {STOCK_TABLE}.date <= %s'''
        query_args.append(end)
    query += ';'

    start_ts = time.time()
    cursor = connect_to_database()
    cursor.execute(query, query_args)
    end_ts = time.time()
    print('Time to execute stock_graph main query:', end_ts - start_ts)

    company_data = {}
    for row in cursor:
        symbol, date, open_val, close_val, volume = row
        value = 0

        if display_option == 'price':
            value = float(close_val) / 100
        elif display_option == 'percent_change':
            if open_val != 0: value = float(close_val - open_val) / float(open_val) 
        elif display_option == 'volume':
            value = volume

        if symbol not in company_data:
            company_data[symbol] = []
        company_data[symbol].append((date, value))

    if width is None:
        width = 1200    # pixels
    else:
        width = float(width)
    if height is None:
        height = 640    # pixels
    else:
        height = float(height)
    
    # matplotlib
    start_ts = time.time()

    dpi = 120

    fig = plt.figure()
    fig.set_dpi(dpi)
    fig.set_size_inches(width / dpi, height / dpi, forward=True)
    fig.set_tight_layout(True)
    plt.xticks(rotation=30, ha='right')
    graph = fig.add_subplot()
    graph.grid(b=True, which='major')
    graph.minorticks_on()
    graph.grid(b=True, which='minor', alpha=0.2)

    for symbol in sorted(company_data):
        sorted_data = sorted(company_data[symbol], key=lambda entry: entry[0])
        dates = [entry[0] for entry in sorted_data]
        values = [entry[1] for entry in sorted_data]
        graph.plot_date(dates, values, linestyle='-', markersize=(10/len(dates)), label=symbol)

    plt.legend(loc=0)   # "best"

    tmp_filename = str(datetime.datetime.now()).replace(' ', '_') + '.png'
    plt.savefig(tmp_filename)

    data = ''
    with open(tmp_filename, 'rb') as infile:
        data = bytes(infile.read())
    os.remove(tmp_filename)

    end_ts = time.time()
    print('Time to do all matplotlib plotting, writing, and reading:', end_ts - start_ts)
    plt.close()
    return data
