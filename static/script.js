// Folder: webapp/pages 
// Authors: Oliver Calder & PJ Sangvong 

var globalStockDictList = [];

/**
 * Gets the url that flask is running on and access that api portion of the flask app
 */
function getBaseUrl(){
    let baseUrl = window.location.protocol + '//' + window.location.hostname + ':' + window.location.port + '/api';
    return baseUrl;
}


async function getAllStockSummary(){
    let url = getBaseUrl() + '/stock_search/';
    return await loadJSONfromUrl(url);
}


async function getStockByLiteralSymbol(symbolString){
    const url = getBaseUrl() + `/stock_summary/${symbolString}`;
    return await loadJSONfromUrl(url);
}


async function getStockBySearchOptions(optionsString){
    const url = getBaseUrl() + `/stock_search/?${optionsString}`;
    return await loadJSONfromUrl(url);
}


/**
 * Loads the data from the url and change it to JSON format
 * 
 * @param {string} url url of the api to get the data
 * @return a list of json dictionaries from the fetched url
 */
async function loadJSONfromUrl(url){
    const stockDataHtml = await fetch(url , {method: 'get'})
    return stockDataJson = await stockDataHtml.json();
}


function constructListOfStockDict(stockDataJson){
    for( let i=0; i<stockDataJson.length; i++){
        let stock = stockDataJson[i];
        
        let stockDict = {
            'symbol': stock.symbol,
            'fullName': stock.full_name
        };

        globalStockDictList.push(stockDict);
    }
}


/**
 * Injects the JSON data to the given tbody
 * 
 * @param {string} tableBodyID the id of the tbody that the data will be injected into
 * @param {JSONObject} stockDataJson the json object of the data to get injected to the given table
 */
function injectJsonToTableBody(tableBodyID, stockDataJson){
    if(stockDataJson == null) return;
    const tableBody = document.getElementById(tableBodyID);
    let dataHTML = '';
    for( let i=0; i<stockDataJson.length; i++){
        let stock = stockDataJson[i];
        let stockId = stock.id;
        dataHTML += `<tr id='row_${stockId}'>
                        <td><input class='checkbox' type='checkbox' id='company_checkbox_${stockId}' onclick="checkBoxPressed( id,'company_checkbox_${stockId}','row_${stockId}')"></td>
                        <td>${stock.symbol}</td>
                        <td>${stock.full_name}</td>
                        <td>${stock.sector}</td>
                        <td>${parseFloat(stock.current_value)}</td>
                        <td>${parseFloat(stock.all_time_high)}</td>
                        <td>${stock.founded_year}</td>
                        <td>${stock.date_first_added}</td>
                    </tr>`;         
    };
    tableBody.innerHTML = dataHTML;
}


function removeRowsInFilteredTableAndDisplayLoading(){
    const filteredTableBody = document.getElementById('filtered-tbody');
    
    // Remove element rows from the table
    while(filteredTableBody.firstChild){
        filteredTableBody.removeChild(filteredTableBody.firstChild);
    }

    injectLoadingCircleTo('filtered-tbody');
}


/**
 * 
 * @param {string} divID supports filtered-tbody and graph-display
 */
function injectLoadingCircleTo(divID){
    const divBody = document.getElementById(divID);
    const loadingHtml = `<div class="loader-container">
                            <div class="loader "></div>
                        </div>`;
    divBody.innerHTML += loadingHtml;
}


function sortDefaultColumnsToDescendingOrder(){
    document.querySelectorAll('table').forEach(table => {
        sortTableByColumn(table, 1); // sorts the 1st index(Symbol) column of the table
    });
}


/**
 * Adds or Removes a row of data to or from the selecetd table's body
 * if the checkbox is unchecked from the seleceted table, checkbox of the row with an identical data in 
 * the filtered table will be unchecked
 * 
 * @param {string} this_company_checkbox_id the id of the checkbox that is being checked
 * @param {string} filtered_company_checkbox_id the id of the checkbox that has an identical data to the 
 *  data in the row that the checkbox is checked in the filtered table(this can be identical to the company_checkbox_id 
 *  if the box in the filtered table is being checked)
 * @param {string} filtered_company_row_id the id of the row that has an identical data to the row that the 
 *  checkbox is checked in the filtered table
 */
function checkBoxPressed(this_company_checkbox_id , filtered_company_checkbox_id, filtered_company_row_id){
    let selectedTable = document.getElementById('selected-tbody');
    
    // can either be a checkBox from filtered table or selected table
    let checkBox = document.getElementById(this_company_checkbox_id);

    let filteredCheckBox = document.getElementById(filtered_company_checkbox_id);
    let filteredRowObject = document.getElementById(filtered_company_row_id);

    // cloneNode will throw error if there is nothing in the filtered table
    try{
        // clones the row from filtered table
        let clonedRoleObject = filteredRowObject.cloneNode(true);

        // modify the ids for row and checkbox to make them unique from one in filtered table
        clonedRoleObject.id = clonedRoleObject.id + '_selected';
        clonedRoleObject.getElementsByTagName('input')[0].id = clonedRoleObject.getElementsByTagName('input')[0].id + '_selected';

        // checks if the checkbox is checked or not
        if (checkBox.checked == true){
            selectedTable.append(clonedRoleObject); // adds a clone row to selected table
        } else{
            let selectedRowObject = document.getElementById(filtered_company_row_id + '_selected'); // gets rowObject from the selected table
            selectedRowObject.parentNode.removeChild(selectedRowObject); // removes the row from selected table
            filteredCheckBox.checked = false; // uncheck the checkbox from the row of filtered table
        }
    }catch(err){ // will get to this if filtered table is empty, so only need to remove row from selected table
        let selectedRowObject = document.getElementById(filtered_company_row_id + '_selected'); // gets rowObject from the selected table
        selectedRowObject.parentNode.removeChild(selectedRowObject); // removes the row from selected table
    }

    reapplySortOn('selected');    
    reapplyDisplayOptions();
}


 /**
  * Resorts the given table based on the sorted column
  * 
  * @param {string} parentDivClassId the class id of the div that holds the table. Can either be 'selected' or 'filtered'
  */
function reapplySortOn(parentDivClassId){
    const tableIndexDictList = getIndexOfSorted();
    
    tableIndexDictList.forEach( dict => {
        if(dict.table.parentElement.classList[0] == parentDivClassId){
            sortTableByColumn(dict.table, dict.index, dict.descending);
        }
    });
}


/**
 * @return a list of dictionaries that hold table object, index number, and descending boolean
 */
function getIndexOfSorted(){
    const tableIndexDictList = [];
    const sortedColumnHeads = document.querySelectorAll('.th-sorted-in-dsc, .th-sorted-in-asc'); // gets all the ths that are being marked as sorted
    sortedColumnHeads.forEach( headerTd => {
        const parentTable = headerTd.parentElement.parentElement.parentElement;
        const index = Array.prototype.indexOf.call(headerTd.parentNode.children, headerTd);
        const isDescending = headerTd.classList.contains('th-sorted-in-dsc');
        tableIndexDictList.push({table: parentTable, index: index, descending: isDescending});
    });
    return tableIndexDictList;
}


/**
 * Gets options from the filtered table and make a dictionary out of them. The options that are 
 * not selecetd or not used will be empty strings
 * @return dictionary of options from the filter box with url string as key and search string as 
 *          value(value is an empty string if nothing is selecetd or typed in)
 */
function getFilterOptions(){
    // gets Seach Bar Value
    let searchString = document.getElementById('search-box').value.trim();

    // get Current Stock Values
    let currentValueMin = document.getElementById('current-min').value.trim();
    let currentValueMax = document.getElementById('current-max').value.trim();

    
    // get All-time High Values
    let allTimeHighMin = document.getElementById('all-time-min').value.trim();
    let allTimeHighMax = document.getElementById('all-time-max').value.trim();

    // get sectors option
    let sectors = document.getElementsByClassName('sector-checkbox');
    let sectorsList = [];
    for(let i=0; i<sectors.length; i++){
        if(sectors[i].checked == true) sectorsList.push(sectors[i].value);
    }
    let sectorsString = sectorsList.join(',');
    
    let optionDict = {
        '&search_string=': searchString,
        '&sector=': sectorsString,
        '&current_value_min=': currentValueMin,
        '&current_value_max=': currentValueMax,
        '&all_time_high_min=': allTimeHighMin,
        '&all_time_high_max=': allTimeHighMax
    };
    return optionDict;
}


/**
 * @return a dictionary of row ids from the selecetd table in form of 'row_{number}'
 */
function getCheckedIdsFromSelecetdTable(){
    const selectedTableElement = document.getElementById('selecetd-table');
    let idDict = {};

    for(let i=1; i<selectedTableElement.rows.length; i++){
        let row = selectedTableElement.rows[i];
        let rowIdSelected = row.id; //  row id from selecetd table will be in form of 'row_{number}_selecetd'

        let regexPattern = /row_\d+/;// only extracts 'row_{number}' out
        let rowId = rowIdSelected.match(regexPattern);

        idDict[rowId] = rowId;
    }
    return idDict;
}


/**
 * 
 * @param {dictionary} idDict a dictionary that contains row_id(s) of the filtered table that need their checkbox checked
 */
function checkBoxesInFilteredTable(idDict){
    let filteredTableElement = document.getElementById('filtered-table')
    for(let i=0; i<filteredTableElement.rows.length; i++){
        let filteredRow = filteredTableElement.rows[i];
        let filteredRowId = filteredRow.id;

        if(filteredRowId in idDict){
            filteredRow.cells[0].children[0].checked = true; // checks the checkbox in filtered table
        }
    }
}


/**
 * 
 * @param {Dictionary} optionDict options from the filter box with url string as key and search string as value
 * @return string that can be put after /api/ to get the filtered data
 */
function getUrlSeachStringFrom(optionDict){
    let urlSearchString = "";
    for(let key in optionDict){
        if(optionDict[key]!=""){
            urlSearchString += key;
            urlSearchString += optionDict[key];
        }
    }
    return urlSearchString;
}


/**
 * Gets new Data from the given options and Recreates filtered table with the data
 */
async function applyFilter(){
    const optionDict = getFilterOptions();
    const urlSearchString = getUrlSeachStringFrom(optionDict);
    let stockDataJson = [];
    
    removeRowsInFilteredTableAndDisplayLoading();

    stockDataJson = await getStockBySearchOptions(urlSearchString).catch( () => {
        stockDataJson = [];
    });

    // recreate filtered table
    injectJsonToTableBody('filtered-tbody', stockDataJson);    
    reapplySortOn('filtered');
    const idDict = getCheckedIdsFromSelecetdTable()
    checkBoxesInFilteredTable(idDict);
}


function clearFilterOptions(){
    // clear fields
    document.getElementById('search-box').value = '';
    document.getElementById('current-min').value = '';
    document.getElementById('current-max').value = '';
    document.getElementById('all-time-min').value = '';
    document.getElementById('all-time-max').value = '';

    // uncheck all the check boxes
    let sectors = document.getElementsByClassName('sector-checkbox');
    for(let i=0; i<sectors.length; i++){
        sectors[i].checked =false
    }
}


/**
 * Clears filter options and Loads all the data to the filtered table
 */
async function resetFilter(){
    clearFilterOptions();
    removeRowsInFilteredTableAndDisplayLoading();
    const stockDataJson = await getAllStockSummary();
    injectJsonToTableBody('filtered-tbody', stockDataJson);
    reapplySortOn('filtered');

    // rechecks the checkboxes in filtered table
    const idDict = getCheckedIdsFromSelecetdTable()
    checkBoxesInFilteredTable(idDict);
}


/**
 * Sorts the data by a given column of a given table with an option to either do ascending or descending sort
 * 
 * @param {HTMLTableElement} table table to sort
 * @param {number} columnIndex the index of the column that will get sorted
 * @param {boolean} descending whether the sorting will be done in the descending order
 */
function sortTableByColumn(table, columnIndex, descending=true){
    const modifier = descending ? -1 : 1;
    const tableBody = table.tBodies[0];
    const row = Array.from(tableBody.querySelectorAll('tr'));
    const indexOfNumberColumnList = [4, 5, 6]; // list of indices that needs to be sorted as number
    const indexOfDataColumnList = [7];

    // Sort all the rolls by the given column
    const sortedRows = row.sort((columnElementA, columnElementB) => {
        let dataA = columnElementA.querySelector(`td:nth-child(${ columnIndex + 1 })`).textContent.trim().toUpperCase();
        let dataB = columnElementB.querySelector(`td:nth-child(${ columnIndex + 1 })`).textContent.trim().toUpperCase();
        if (indexOfNumberColumnList.includes(columnIndex)){
            dataA = parseFloat(dataA);
            dataB = parseFloat(dataB);
        } else if (indexOfDataColumnList.includes(columnIndex)){
            dataA = new Date(dataA);
            dataB = new Date(dataB);
            dataA = dataA.getTime();
            dataB = dataB.getTime();
        }

        return dataA > dataB ? -1 * modifier : 1 * modifier;
    })

    // Remove element rows from the table
    while(tableBody.firstChild){
        tableBody.removeChild(tableBody.firstChild);
    }

    // Add new ordered elements to the list
    tableBody.append(...sortedRows);

    // Mark whether the column is sorted in an ascending or descending order
    table.querySelectorAll('th').forEach( th => th.classList.remove('th-sorted-in-dsc', 'th-sorted-in-asc')); 
    table.querySelector(`th:nth-child(${ columnIndex + 1 })`).classList.toggle('th-sorted-in-dsc', descending);
    table.querySelector(`th:nth-child(${ columnIndex + 1 })`).classList.toggle('th-sorted-in-asc', !descending);
}


function displayTextOnSearchBox(searchBox, displayText){
    searchBox.value = displayText;
}


/**
 * Displays suggesstions that starts with the the value of the input in searchBox
 * 
 * @param {HTMLElement} searchBox Element of the input search box
 */
function displaySugestions(searchBox){
    const input = searchBox.value.toUpperCase();
    const symbolSuggestionsElement = document.getElementById('symbol-suggestions');
    const fullnameSuggestionsElement = document.getElementById('fullname-suggestions');
    const symbolHeaderContainerElement = document.getElementById('symbolHeaderContainer');
    const fullnameHeaderContainerElement = document.getElementById('fullnameHeaderContainer');

    const symbolSuggestionsHeader = '<div class="header-suggestion">Symbol</div>';
    const fullnameSugestionsHeader = '<div class="header-suggestion">Fullname</div>';

    // empty suggestions elements before adding
    symbolSuggestionsElement.innerHTML = '';
    fullnameSuggestionsElement.innerHTML = '';
    symbolHeaderContainerElement.innerHTML = '';
    fullnameHeaderContainerElement.innerHTML = '';

    // filter the globalStockDictList to only stockDicts that start with the given input
    const symbolSuggestions = globalStockDictList.filter( stockDict => {
        return stockDict.symbol.toUpperCase().startsWith(input);
    });
    const fullnameSuggestions = globalStockDictList.filter( stockDict => {
        return stockDict.fullName.toUpperCase().startsWith(input);
    });

    // show headers if the suggestions exist
    if(symbolSuggestions.length>0) symbolHeaderContainerElement.innerHTML = symbolSuggestionsHeader
    if(fullnameSuggestions.length>0) fullnameHeaderContainerElement.innerHTML = fullnameSugestionsHeader

    // append every filtered stocks to the container elements
    symbolSuggestions.forEach( suggestedDict => {
        const suggestedDiv = document.createElement('div');
        suggestedDiv.innerHTML = suggestedDict.symbol;

        // makes clicking suggestion autofill the suggestion to the searchBox
        suggestedDiv.onclick = function(){
            displayTextOnSearchBox(searchBox, this.innerHTML);
            displaySugestions(searchBox); // needs to reset the suggestions after new text is added
        };

        symbolSuggestionsElement.appendChild(suggestedDiv);
    });

    fullnameSuggestions.forEach( suggestedDict => {
        const suggestedDiv = document.createElement('div');
        suggestedDiv.innerHTML = suggestedDict.fullName;

        // makes clicking suggestion autofill the suggestion to the searchBox
        suggestedDiv.onclick = function(){
            displayTextOnSearchBox(searchBox, this.innerHTML);
            displaySugestions(searchBox); // needs to reset the suggestions after new text is added
        };

        fullnameSuggestionsElement.appendChild(suggestedDiv);
    });
    
    // empty everything if nothing is in the input
    if(input == ''){
        symbolHeaderContainerElement.innerHTML = '';
        fullnameHeaderContainerElement.innerHTML = '';
        symbolSuggestionsElement.innerHTML = '';
        fullnameSuggestionsElement.innerHTML = '';
    }
}


/**
 * This is a no-parameter version is to make it callable from html
 */
function displaySuggestionsOnSearchBox(){
    let searchBox = document.getElementById('search-box');
    displaySugestions(searchBox);
}


/**
 * Adds delay so the suggestion can be clicked and run before gets deleted
 */
function hideSuggestions(){
    window.setTimeout( () => {
        hideSuggestionsHelper();
    }, 150);
}


function hideSuggestionsHelper(){
    const symbolSuggestionsElement = document.getElementById('symbol-suggestions');
    const fullnameSuggestionsElement = document.getElementById('fullname-suggestions');
    const symbolHeaderContainerElement = document.getElementById('symbolHeaderContainer');
    const fullnameHeaderContainerElement = document.getElementById('fullnameHeaderContainer');

    // empty suggestions elements
    symbolSuggestionsElement.innerHTML = '';
    fullnameSuggestionsElement.innerHTML = '';
    symbolHeaderContainerElement.innerHTML = '';
    fullnameHeaderContainerElement.innerHTML = '';
}


function selectDateOption(selectedOption){
    const dateOptionList = document.getElementsByClassName('date-option');

    // removes selected class from all the options
    for(let i=0; i<dateOptionList.length;i++){
        dateOptionList[i].classList.remove('selected');
    }

    // adds selected class to the selecetd option
    selectedOption.classList.add('selected');

    // removes or adds transparency from datesContainers classlist if CUSTOM is selected or not selected
    const datesContainers = document.getElementById('dates-container');
    const startDate = document.getElementById('start-date');
    const endDate = document.getElementById('end-date');
    if(selectedOption.getAttribute('value') == 'custom') {
        datesContainers.classList.remove('transparency');
        startDate.readOnly = false;
        endDate.readOnly = false;
    } else{
        if(!datesContainers.classList.contains('transparency')){
            datesContainers.classList.add('transparency');
            startDate.readOnly = true;
            endDate.readOnly = true;
        } 
    }

    reapplyDisplayOptions();
}


function getDisplaySettings(){
    const GRAPHHEIGHT = document.getElementById('graph-display').offsetHeight - 20; // there's a 20 pixel margin
    const GRAPHWIDTH = document.getElementById('graph-display').offsetWidth - 20;

    const displayOptions = document.getElementById('display-option');
    const dateOptions = document.getElementById('date-options');
    const startDate = document.getElementById('start-date');
    const endDate = document.getElementById('end-date');

    const displayOption = displayOptions.options[displayOptions.selectedIndex];
    let dateOption = dateOptions.children[0]; // gets a random child

    // finds one that is selected
    for(let i=0; i<dateOptions.children.length; i++){
        if(dateOptions.children[i].classList.contains('selected')) dateOption =  dateOptions.children[i];
    }

    const settingsDict = {
        'display_option' : displayOption.value,
        'date_option' : dateOption.getAttribute('value'),
        'start_date' : startDate.value,
        'end_date' : endDate.value,
        'width': GRAPHWIDTH,
        'height': GRAPHHEIGHT
    };
    return settingsDict;
}


/**
 * Constructs the Url for the graph endpoint
 * 
 * @param {dictionary} settingsDict contains 'display_option', 'date_option', 'start_date', 'end_date', 'width', 'height'
 * @param {Array} symbolList contains the symbols that needs to be fetched
 */
function constructGraphUrl(settingsDict, symbolList){    
    const symbolsString = symbolList.join(',');

    let graphUrl = getBaseUrl() + `/stock_graph/${symbolsString}.png?`
    for(let key in settingsDict){
        graphUrl += '&';
        graphUrl += key;
        graphUrl += '=';
        graphUrl += settingsDict[key];
    }
    
    return graphUrl;
}


/**
 * Replaces the graphDisplayElement with a text div
 */
function injectNoDisplayDiv(){
    const noDisplayHTML =`<div class="no-display-container">
                                <div class="no-display">Select a Stock to Display Graph</div>
                        </div>`;
    const graphDisplayElement = document.getElementById('graph-display');
    graphDisplayElement.innerHTML = noDisplayHTML;
}


/**
 * Goes through all the functions to display graph on display container
 */
async function reapplyDisplayOptions(){
    const settingsDict = getDisplaySettings();

    // get all the smybol from selected table
    let symbolList = [];
    const stockIdDictsFromSelectedTable = getCheckedIdsFromSelecetdTable();
    const stockIdList = Object.values(stockIdDictsFromSelectedTable);

    for(let i=0; i<stockIdList.length; i++){
        symbolList.push(document.getElementById(stockIdList[i].input).children[1].innerHTML); //pushes symbol to the list
    }

    const graphUrl = constructGraphUrl(settingsDict, symbolList);
    fetch(new Request(graphUrl) , {method: 'get'}).then( res => {
        if(!res.ok) throw new Error('Nothing From Fetching The Graph');
        displayGraph(res.url);
    }).catch( err => {
        console.log(err);
        injectNoDisplayDiv();
    });
}


async function displayGraph(graphUrl){
    const graphDisplayElement = document.getElementById('graph-display');
    
    graphDisplayElement.innerHTML = '';
    const graphHTML = `<img src="${graphUrl}" class="graph-element">`;
    graphDisplayElement.innerHTML = graphHTML;
}


async function selectDefaultStocks(){
    const stock1 = document.getElementById('row_140'); // Delta Air Lines Inc.
    const stock2 = document.getElementById('row_458'); // United Airlines Holdings

    stock1.children[0].children[0].click();
    window.setTimeout( () => {
        stock2.children[0].children[0].click();
    }, 400);
}


/**
 * Gets today's date and Puts it on the date options calender
 */
function addCurrentAndMaxDate(){
    const startDateElement = document.getElementById('start-date');
    const endDateElement = document.getElementById('end-date');

    let today = new Date();
    let todayValue = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);

    startDateElement.value = "1957-03-04"; // the first day of S&P 500
    startDateElement.max = todayValue;
    endDateElement.value = todayValue;
    endDateElement.max = todayValue;
}


/**
 * Makes filter-box sticky when scroll passes the table-box if the table is longer than filter box
 */
window.onscroll = () => {
    const filterElement = document.getElementById('filter-box');
    const tableElement = document.getElementById('table-box');

    if (tableElement.offsetHeight > filterElement.offsetHeight && tableElement.offsetTop < window.pageYOffset){
        filterElement.classList.add('sticky');
    }else{
        filterElement.classList.remove('sticky');
    }
};


/**
 * resize the Graph Display when the screen size changes
 */
window.onresize = function() {
    if(this.resizeTO) clearTimeout(this.resizeTO);
    this.resizeTO = setTimeout(function() {
        reapplyDisplayOptions();
    }, 300);
};


window.onload = async () => {
    removeRowsInFilteredTableAndDisplayLoading();
    injectLoadingCircleTo('graph-display');

    // gets the current date and adds to the end date option
    addCurrentAndMaxDate();

    // loads data into the table
    const stockDataJson = await getAllStockSummary();
    injectJsonToTableBody('filtered-tbody', stockDataJson);
    constructListOfStockDict(stockDataJson);
    sortDefaultColumnsToDescendingOrder();

    selectDefaultStocks();

    // displays suggestions in case something is typed into the search box while loading data
    displaySuggestionsOnSearchBox(); 

    // adds evenlistener for sorting to all the theads except the Selecetd column
    document.querySelectorAll('.sortable-table th').forEach( headerCell => {
        if(headerCell.textContent != 'Selected'){
            headerCell.addEventListener('click', () =>{
                const tableElement = headerCell.parentElement.parentElement.parentElement;
                const headerIndex = Array.prototype.indexOf.call(headerCell.parentElement.children, headerCell);
                const isDescending = headerCell.classList.contains('th-sorted-in-dsc');
    
                sortTableByColumn(tableElement, headerIndex, !isDescending);
            });
        }        
    });

    // adds evenlistener to searchBox
    let searchBox = document.getElementById('search-box');
    searchBox.addEventListener('keyup', () => {
        displaySuggestionsOnSearchBox();
    });
};