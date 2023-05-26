//5.25.23

//Sources
//https://developers.google.com/apps-script/reference/spreadsheet
//https://developer.mozilla.org/en-US/docs/Web/JavaScript 


//Lifespan Datapoint
//Datapoint: {day: int, alive: int, dead: int, date: Date}
//day is the day in the lifespan
//alive is the number of individuals alive
//dead is the number of individuals dead
//date is the date the datapoint was recorded as a Date Object
class DataPoint {
    constructor(day, alive, dead, date) {
      this.day = day
      this.alive = alive
      this.dead = dead
      this.date = date
    }
  }
  
  //Lifespan technical replicate corresponding to a single vial
  //Technicalreplicate: {data: [DataPoint], name: String, row: int}
  //data is the list of data for the technical replicate
  //name the name for the replicate normally the genotype
  //Row is the row in the sheet in the raw data the TechnicalReplicate is derived from
  class TechnicalReplicate {
    constructor(data, name, row) {
  
      //String: Genotype of the replicate
      this.name = name
  
      //Int: Row of the raw data 
      this.row = row
      
      //[DataPoint]: All the datapoints for the replicate
      this.data = data
  
      //Int: Total number of individuals in replicate
      this.sampleSize = data[0].alive
  
      //Int: last day that the replicate was scored
      this.numberOfDays = this.data[this.data.length-1].day
  
      //Int: number of individuals cleaned for this replicate
      this.cleaned = 0
    }
  
    //Get a DataPoint from a TechnicalReplicate
    //This is required since datapoints may not exist if scoring was missed on a given day
    //Returns the last datapoint where data was scored
    //getDataPoint: Int -> DataPoint?
    getDataPoint(day) {
  
      //Check if the day is less than 0 and return null 
      //base case for recursion
      //This should not be triggered unless the replicate has no data
      if (day < 0){
        return null
  
      //if the day is greater than 0
      } else {
  
        //Check if there is data for the desired day
        const found = this.data.findIndex(x => x.day == day)
  
        //If there is data return it
        if (found > -1) {
          return this.data[found]
  
        //If there is no data return the data for the last day with data
        } else {
          return this.getDataPoint(day-1)
        }
      }
    }
  
    //Check if a TechnicalReplicate can be cleaned
    //cleanable: This -> Bool 
    cleanable(){
  
      //loop through all possible slices [x,x+6] (exclusive like Array.Slice()) where x > 9
      //At least 15 days required for cleaning
      for(var i = 15; i <= this.numberOfDays; i++){
  
        //intialize the slice
        var slice = []
  
        //fill the slice with the number alive at each day
        for(var j = i-5; j <= i; j++){
          slice.push(this.getDataPoint(j).alive)
        }
        //if the number alive did not change and is not 0 return true
        if(slice.every(x => x == slice[0] && x > 0)){
          return true
        }
      }
  
      //otherwise return false
      return false
    }
  }
  
  // A BiologicalReplicate consists of aggregated data from technical replicates
  //BiologicalReplicate: {technicalReplicates: [TechnicalReplicate], name: String}
  //technicalReplicates is a list of the technical replicates
  //name is the label ordinarily genotype
  class BiologicalReplicate {
    constructor(technicalReplicates, name) {
  
      //[TechnicalReplicate]: A list of technical replicates
      this.technicalReplicates = technicalReplicates
  
      //String: Genotype or identifier
      this.name = name
  
      //Int: Sample size of the biological replicate
      this.sampleSize = technicalReplicates.reduce((acc,rep) => acc + rep.sampleSize - rep.cleaned, 0)
  
      //Int: The total number of individuals cleaned from all technical technicalReplicates
      this.cleaned = technicalReplicates.reduce((acc,rep) => acc + rep.cleaned, 0)
      
      //Int: The median survival of the biological replicate
      this.median = 0
  
      //Int: the maximum number of days any technicalReplicates was scored for
      this.maxNumberOfDays = Math.max(...technicalReplicates.map(x => x.numberOfDays))
  
      //[Int]: list of the number of NEW inviduals dead on each day across all technical replicates
      this.deathEvents = []
  
      //[Int]: list of the TOTAL number of inviduals dead on each day across all technical replicates 
      this.totalDeaths = []
  
      //Populate totalDeaths and deathEvents with the relevant values
      //loop through all days
      for (var i = 0; i <= this.maxNumberOfDays; i++){
  
        //The number of deaths on day i
        var dead = 0;
  
        //loop through all technicalReplicates
        for(var j = 0; j < this.technicalReplicates.length; j++){
  
          //Check if the current technical replicate reaches this day
          if (this.technicalReplicates[j].numberOfDays >= i) {
  
            //Check if day is greater than initial day (Can't have deaths on day 1)
            if(i > 0) {
  
              //add any newly dead individuals on this day from this technicalReplicates to the total dead for this day
              //This is done by substracting the current days dead from the last recorded days dead
              dead = dead + this.technicalReplicates[j].getDataPoint(i).dead-this.technicalReplicates[j].getDataPoint(i-1).dead
            }
          }
        }
  
        //Add the number of new deaths to the list of death events
        this.deathEvents.push(dead)
  
        //check if the total deaths list is empty and if so append it with initial deaths
        if (this.totalDeaths.length == 0) {
          this.totalDeaths.push(dead)
  
        //If it is non-empty add the number of new deaths plus the old number of deaths to the total deaths list
        } else {
          this.totalDeaths.push(this.totalDeaths[this.totalDeaths.length - 1] + dead)
        }
      }
  
      //Calculates the Median survival of the biological replicate
      //loop through the list of deaths on each day
      for(var j = 0;j<this.totalDeaths.length;j++){
        //Check if the number of deaths is more than half the number of individuals
        if (this.totalDeaths[j] > this.sampleSize/2){
  
          //Start at current position and go backwards
          for(var i = j;i>=0;i--){
  
            //Check if the number of deaths is less or equal to than half the number of individuals
            if (this.totalDeaths[i] < this.sampleSize/2){
  
              //Set the median to half the sum of:
              // the first point with more than half the individuals are dead
              // the last point with less than half the invidiuals dead plus 1
              this.median = (j+(i+1))/2
  
              // stop looping once median found
              break;
            }
          }
  
          // stop looping when above loop is complete (median found)
          break;
        }
      }
    }
  }
  
  //Script for entering data
  //Requires data to be formatted with the following parameters
  //Total number of indiviudals in technical replicates must be column X in "=R[0]CX-R[0]C[-1]"
  //Datapoints must be recorded in 1x3 format of Date, Dead, Alive, 
  //Assumes no deaths, number of deaths must be updated manually and number remaining alive will update by formula
  //Autolifespan: Nothing -> Nothing
  function Autolifespan() {
  
    //get the current date
    const date = new Date()
    date.setHours(0, 0, 0, 0);
  
    //Set the selected cell to the current date
    SpreadsheetApp.getCurrentCell().setValue(date)
  
    //select the cell one to the right (dead)
    const cell = SpreadsheetApp.getCurrentCell().offset(0, 1).activate();
  
    //set that cell to 0
    cell.setValue('0');
  
    //Set the cell two to the right (alive) to the specified formula (alive = total number in replicate - dead)
    cell.offset(0, 1).setFormulaR1C1('=R[0]C10-R[0]C[-1]');
  }
  
  //clean: TechnicalReplicate -> TechnicalReplicate
  //Takes in a TechnicalReplicate and cleans it
  function clean(replicate) {
  
    //if the replicate is not cleanable (nothing to clean) return it
    if (!replicate.cleanable()) {
      return replicate
  
    //if the replicate can be cleaned
    } else {
  
      //loop through the data
      for (var i = 0; i < replicate.data.length; i++){
  
        //if the number alive is positive remove 1 from the number alive
        if (replicate.data[i].alive > 0){ 
          replicate.data[i].alive = replicate.data[i].alive -1
  
        //if the number alive is 0 remove 1 from the dead
        } else {
          replicate.data[i].dead = replicate.data[i].dead -1
        }
      }
    }
  
    //add 1 to the total number cleaned
    replicate.cleaned = replicate.cleaned + 1
  
    //repeat until no longer cleanable 
    return clean(replicate)
  }
  
  //Read data in according to parameters specified in the sheet labeled graph
  //Turns data into a [TechnicalReplicate]
  //ReadRows: Nothing -> [TechnicalReplicate]
  function readRows(cleanData = true) {
  
    //load the sheet named graph and activate it
    const parameterSheet = SpreadsheetApp.getActive().getSheetByName("graph");
    parameterSheet.activate();
  
    //get the data in the sheet
    const inputParameters = parameterSheet.getDataRange().getValues();
  
    //get the row to start loading data from (A2)
    const startRow = parseInt(inputParameters[1][0]) - 1;
    
    //get the row to end reading data at (B2)
    const endRow = parseInt(inputParameters[1][1]) - 1;
  
    //get the name of the sheet to graph 
    //Not case sensitive but is space sensitive (C2)
    const sheetToGraph = inputParameters[1][2];
  
    //get the column where the genotypes are listed (D2)
    const namesColumn = parseInt(inputParameters[1][3]) - 1;
  
    //get the column where the initial number of individuals are list (E2)
    const dayZeroColumn = parseInt(inputParameters[1][4]) - 1;
  
    //check if the data should be cleaned (F2)
    //passing argument into function overrides this check
    //"yes" or "no" are expected inputs in sheet
    if (cleanData) {
      cleanData = !(inputParameters[1][5].toLowerCase() == "no" || inputParameters[1][5].toLowerCase() == "no " || inputParameters[1][5].toLowerCase() == " no" || inputParameters[1][5].toLowerCase() == " " || inputParameters[1][5].toLowerCase() == "")
    }
  
    //load and activate the sheet with the data
    const dataSource = SpreadsheetApp.getActive().getSheetByName(sheetToGraph);
    dataSource.activate();
  
    //load the data in the seet
    const data = dataSource.getDataRange().getValues();
  
    //initialize the output, a list of TechnicalReplicate
    var rows = []
  
    //The name of the current row being read in
    var name = "Undefined"
  
    //Loop through the rows of data starting at the indicated row and ending at the indicated row
    for (var i = startRow; i <= endRow; i++) {
  
      //check if the cell where the name should be is non-empty
      if (data[i][namesColumn] != "" && data[i][namesColumn] != " ") {
  
        //If the name is not empty change the current name to the new name
        name = data[i][namesColumn].toString()
      }
  
      //Initialize a [DataPoint] for a replicate
      var replicateData = []
  
      //The initial number of individuals alive
      const totalIndividuals = data[i][dayZeroColumn + 1]
  
      //The date of the replicate was started
      const startDay = data[i][dayZeroColumn]
      
      //Check if the number of individuals initially alive is a number and the intial day is a date
      if (typeof(totalIndividuals)=="number" && typeof(startDay)=="object") {
  
        //add the intial datapoint to the list of date with no deaths
        replicateData.push(new DataPoint(0, parseInt(totalIndividuals), 0, startDay))
  
      //loop through the row beginning at the location where the first datapoint should be
      //jump by 3 since each entry consists of a date, dead, and alive
      for (var j = dayZeroColumn+2; j < data[i].length; j = j+3) {
  
        //date of the current datapoint 
        const curDate = data[i][j]
        
        //dead individuals at the current datapoint 
        const curDead = data[i][j + 1]
        
        //alive individuals at the current datapoint 
        const curAlive = data[i][j + 2]
  
        //Check if the number of individuals alive and dead are numbers and the date is a Date
        if (typeof(curAlive)=="number" && typeof(curDead)=="number" && typeof(curDate)=="object") {
  
          //ensure the number of dead, alive, and date are non-empty
          //get the day in the lifespan
          const curDay = Math.round((curDate-startDay)/(1000*60*60*24))
          
          //Catch any problems with dates
          if (replicateData.findIndex(x => x.day == curDay) > -1) {
            console.log(curDate, (curDate-startDay)/(1000*60*60*24))
          }
  
          //Add the datapoint to the list of datapoints
          replicateData.push(new DataPoint(curDay, curAlive, curDead, curDate))
        }
      }
  
      //add a new replicate to the list of replicates
      rows.push(new TechnicalReplicate(replicateData, name, i))
    }
    }
  
    //Check if the data should be cleaned
    if (cleanData) {
  
      //If the data should be cleaned return the cleaned data as [Replicate]
      return rows.map(x => clean(x))
    } 
  
    //Return the formatted data as [Replicate]
    return rows
  }
  
  //Find data entry errors in the datasheet and highlight them
  //Date entry errors are highlighted in lime green
  //  Date is repeated (lifespan was never scored twice on the same day)
  //Lifespan entry errors are highlited in magenta
  // Number alive and dead does not sum to correct total
  // Number alive increased
  //findErrors: Nothing -> Nothing
  function findErrors() {
  
    //read in the rows without cleaning
    const rows = readRows(false)
  
    //activate the Graph sheet
    const parameterSheet = SpreadsheetApp.getActive().getSheetByName("graph");
    parameterSheet.activate();
  
    //get the data from the graph sheet
    const inputParameters = parameterSheet.getDataRange().getValues();
  
    //Read in the name of the sheet to graph need is not case sensitive but is space sensitive (C2)
    const sheetToGraph = inputParameters[1][2];
  
    //Read in the the column where the initial number of individuals are list (E2)
    const dayZeroColumn = parseInt(inputParameters[1][4]) - 1;
  
    //activate the sheet with the data
    const dataSource = SpreadsheetApp.getActive().getSheetByName(sheetToGraph);
    dataSource.activate();
  
    //lists of coordinates for errors
    //Lifespan data errors
    var revives = [];
  
    //Date errors
    var dates = []
  
    //loop through the rows
    for(var i=0; i<rows.length;i++){
  
        //loop through a technical replicates data
        for(var j=1; j<rows[i].data.length;j++){
  
          // check if the number alive is greater than on the previous day
          // or if  alive + dead does not equal the correct total
          if ((rows[i].data[j].alive > rows[i].data[j-1].alive) || (rows[i].data[j].alive + rows[i].data[j].dead != rows[i].sampleSize)){
  
            //estimates the cell of the errors and adds it to the lifespan data errors list
            //this may be off if there are discrepancies with the data especially date errors as well
            //Assumes:
            // First 5 days of lifespan were not scored
            revives.push([rows[i].row+1,dayZeroColumn+1+2+(rows[i].data[j].day-5)*3])
          }
  
          //check if the day is ever equal to the previous day
          if (rows[i].data[j].day == rows[i].data[j-1].day) {
  
            //add the first cell of the row to the dates errors list
            //Not possible to identify the cell since the dates are not correct
            dates.push(rows[i].row+1)
          }
        }
      }
      
    //loop through the lifespan data errors and highlight the error cells in magenta
    for(var i=0; i < revives.length; i++) {
  
      //Tries to highlight the estimated location of the error
      try {
        dataSource.getRange(revives[i][0],revives[i][1],1,3).setBackground("magenta")
  
      //If the estimate is outside the range of the data highlights the second cell in the row
      } catch {
        dataSource.getRange(revives[i][0],2).setBackground("magenta")
      }  
    }
  
    //loop through the date  errors and highlight first cell in the row in lime
    for(var i=0; i < dates.length; i++) {
      dataSource.getRange(dates[i],1).setBackground("lime")
    }
  }
  
  //Takes in a non-empty list of TechnicalReplicates and combines adjacent rows with the same name into BiologicalReplicates
  //aggregateRows: [TechnicalReplicate] -> [BiologicalReplicate]
  function aggregateRows(rows) {
  
    //Initialize [BiologicalReplicate] to return
    var biolReplicates = []
  
    //get the name of the first row
    var currentName = rows[0].name
  
    //A [Replicate] to combine into a single BiologicalReplicate
    var replicates = []
  
    //loop through the rows
    for(var i = 0; i<rows.length;i++) {
  
      //if the row name is the same as the last row name
      if (rows[i].name == currentName){
  
        //add the row to the list of technical replicates
        replicates.push(rows[i])
  
      //if the row name is not the same as the last row name
      } else {
  
        //Finish the biological replicate and append it to the output list
        biolReplicates.push(new BiologicalReplicate(replicates, currentName))
  
        //Add the new row to a new list of technical replicates
        replicates = [rows[i]]
  
        //update the last row's name to the new row's name
        currentName = rows[i].name
      }
    }
  
    //Add the last biological replicate to the output
    biolReplicates.push(new BiologicalReplicate(replicates,currentName))
  
    //return the [BiologicalReplicate]
    return biolReplicates
  }
  
  //Outputs a summary of the lifespan data into Output sheet
  //Parameters are defined by Graph Sheet and readRows()
  //Output includes names, sample size, cleaned, median
  //summarize: Nothing -> Nothing
  function summarize() {
  
    //Read in the data
    const rows = readRows()
  
    //activate and clear the output
    const output = SpreadsheetApp.getActive().getSheetByName("Output");
    output.activate();
    output.clearContents()
  
    //Created a [BiologicalReplicate]
    const biolReplicates = aggregateRows(rows)
  
    //Add a header to the output
    output.appendRow(["name","n","cleaned","median"])
  
    //loop through the biological replicates
    for(var i=0;i<biolReplicates.length;i++) {
  
      //Ouput a row containing the biological replicate name, sample size, number of cleaned, and median survival
      output.appendRow([biolReplicates[i].name, biolReplicates[i].sampleSize, biolReplicates[i].cleaned, biolReplicates[i].median])
    }
  }
  
  //Format Data for Prism
  //BiologicalReplicate.deathEvents is [Int] representing number of deaths on each day (0 if no deaths)
  //format: BiologicalReplicate -> [Number]
  function format(biolReplicate) { 
  
      //list of deaths (1 for death, 0 for censored) and day
      var events = []
  
      //loop through the deaths on every day
      for(var i = 0; i<biolReplicate.deathEvents.length;i++) {
  
        //for each day for each death add a 1 to the deaths list and the corresponding day to the days 
        for(var j = 0; j<biolReplicate.deathEvents[i];j++) {
          events.push([i,1])
        }
  
        //for loop through the technical replicates for the biological replicate
        for (var j = 0;j<biolReplicate.technicalReplicates.length;j++){
  
          //get the last day of the replicate
          const last = biolReplicate.technicalReplicates[j].numberOfDays
          const lastAlive = biolReplicate.technicalReplicates[j].data[biolReplicate.technicalReplicates[j].data.length -1].alive
  
          //if it is the last day
          if (last == i){
  
            //if anything is still alive on the last day
            if(lastAlive > 0) {
  
              //for each individual still alive add a 0 to the dead list and the corresponding day to the days list
              for (var m = 0;m<lastAlive;m++){
                events.push([i,0])
              }
            }
          }
        }
      }
  
      //check if the number of individuals corresponds to the number of events
      //add an error to the output if not
      if(biolReplicate.sampleSize!=events.length) {
        console.log(biolReplicate.sampleSize, events.length)
        events.push(["err","err"])
      }
  
      //return the lists of days and events paired together
      return events
  }
  
  //Output data formatted for Prism
  //prism: Nothing -> Nothing
  function prism() {
  
    //read in rows
    const rows = readRows()
  
    //Activate and clear the output sheet
    const output = SpreadsheetApp.getActive().getSheetByName("Output");
    output.activate();
    output.clearContents()
  
    //Create a list of BiologicalReplicate
    const biolReplicates = aggregateRows(rows)
  
    //list of days where events occured
    var daylist = ["Days"]
  
    //list of lists formatted data one per biological replicate to output
    var data = []
  
    //loop through the biological replicates
    for(var i=0;i<biolReplicates.length;i++) {
  
      //format each biological replicate
      const formatted = format(biolReplicates[i])
  
      //create an array of empty strings to offset the data by the amount of data so far
      const space = new Array(daylist.length-1).fill("")
  
      //add the new days to the daylist
      daylist = daylist.concat(formatted.map(x => x[0]))
      
      //add the new data to the lists of data
      data.push([biolReplicates[i].name].concat(space).concat(formatted.map(x => x[1])))
    }
    
    //output the daylist into the sheet
    output.getRange(1,1,daylist.length,1).setValues(daylist.map(x=>[x]))
  
    //output the data into the sheet
    for(var i=0;i<data.length;i++) {
      output.getRange(1,i+2,data[i].length,1).setValues(data[i].map(x =>[x]))
    }
  }
  