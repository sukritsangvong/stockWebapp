**AUTHORS: Oliver Calder and PJ Sangvong**

This project is a final project for Carleton's Software Design Class. 

To run this program, one needs to run update_database.sh to create and update postgreSQL database.
```cd setup/``` and ```./update_database.sh```

After the database is implemented, ```python3 app.py localhost 5000```

**DATA:**  S&P 500 Stock Data from 1957 to current.  In particular, this includes daily stock data for
    the open, high, low and close values, as well as trading volume, of each stock in the S&P 500.
    In order to know which stocks are in the S&P 500, we pull data from Wikipedia, parse it using
    lynx and awk, and then create tables for company information, including stock symbol, the
    company's name, a unique id, the company's sector, headquarters location, founding year, and
    the date it was added to the S&P 500.  We store headquarters locations and sectors in their
    own tables as well.  Each daily stock value entry then references a company by id, where the
    company's data is found in the companies table.

**COPYRIGHT:**  All stock data is public record, and in this case comes from Yahoo Finance.  All company
    information is pulled directly from Wikipedia, where it is publicly available as well.

**GETTING DATA:**  Our data (from midday November 23) is available at
    https://calder.dev/files/stock_data.sql
    Additionally, our data can also be regenerated up to date by calling the shell script found at
    webapp/setup/update_database.sh


**Features:**
**Graph:** 
    - Displays stock data from the Selected Table
    - is customizable via the display options below the graph
    - Refreshes every-time a new stock or a new display option is selected
        - Also refreshes whenever the window is resized, and there is a slight delay so that it
            waits for resizing to be done before triggering a new 
    - Created the graph via matplotlib on the flask server
        - flask sends png via endpoints and webapp picks the png from the link and displays it
    - We had originally intended for the graph to be interactive to mouse hovering, as many stock
        graphs often are, but this required that all data be stored in the client's browser, which
        we did not want to do (see Notes).

**Table:** 
    - Can be Sorted by clicking on the header columns
        - the arrow identifies whether it is in a descending or ascending order
    - Has checkbox feature
        - checking the checkboxes will add the data of that row to filtered table and display the
            data on the graph
        - unchecking the checkboxes will remove the data from the graph and the filtered table and
            will uncheck the checkboxes of the identical data on the Selected Table
    Selected Table:
        - Displays all the stock data that will be plotted on the graph
        - when the page first loads, Delta Airlines and United Airlines are selected, as samples
    Filtered Table:
        - Displays all the stock data after the filter options are applied
            - default is to show everything, as is the case when the page first loads

**Filter Box:** 
    - Gets the stock data that match the given filter options by pressing Apply Filter, ENTER Key,
        or Reset Filter
    - Has Search Box that has suggestion and autofill features
    - Is sticky when the height of the table exceeds the Filter Box's height


**NOTES:** 
    - We had lots of dicussions regarding how to handle the data, and relatedly, how to render the
        stock grapg
    - We had to decide whether we want the server side or the client side to handle the stock data,
        and which would generate the graph to plot
    - Given that our stock data are day-to-day data point, and it is possible for the client to
        display all 503 stocks on the graph, wherever the graph is generated, it would need access 
        to the complete dataset, which is ~150 MiB
    - Since we do not want to wait for the load times of transfering this data over a network, we
        opted to have the server handle all the stock data, and generate the graph image for us
        - Thus, the graph cannot easily be interactive.
        - However, loading times are much faster, and SQL + server-side Python can handle the
            computations locally, thus requiring us to only send the final data to the client
        - We essentially traded off some aesthetics and functionalities for a better, faster experience
            for the clients
