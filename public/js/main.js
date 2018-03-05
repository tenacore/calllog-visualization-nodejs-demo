window.onload = init;
var colors = ["BlanchedAlmond","Blue","BlueViolet","Brown","BurlyWood","CadetBlue","Chartreuse","Chocolate","Coral","CornflowerBlue","Cornsilk","Crimson","Cyan","DarkBlue","DarkCyan","DarkGoldenRod","DarkGray","DarkGrey","DarkGreen","DarkKhaki","DarkMagenta","DarkOliveGreen","Darkorange","DarkOrchid"];
var callLogsData = null
function init() {
  $( "#fromdatepicker" ).datepicker({ dateFormat: "yy-mm-dd"});
  $( "#todatepicker" ).datepicker({dateFormat: "yy-mm-dd"});
  var pastMonth = new Date();
  var day = pastMonth.getDate()
  var month = pastMonth.getMonth() - 1
  var year = pastMonth.getFullYear()
  if (month < 0){
    month = 11
    year -= 1
  }
  $( "#fromdatepicker" ).datepicker('setDate', new Date(year, month, day));
  $( "#todatepicker" ).datepicker('setDate', new Date());

  google.charts.load('current', {'packages':['corechart']});
  google.charts.load('current', { 'packages': ['map'] });
}

// Main class
function CallLogsData(records) {
  this.records = records
  this.timeSliceInbound = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  this.timeSliceOutbound = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  this.timeSliceMissedCalls = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  this.timeSliceVoicemails = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  this.incallCount = 0;
  this.outcallCount = 0
  this.voiceCallCount = 0
  this.voicemailCount = 0

  this.infaxCount = 0
  this.outfaxCount = 0
  this.totalInfaxesDuration = 0
  this.totalOutfaxesDuration = 0

  this.missedCallCount = 0
  this.incallRecordingCount = 0
  this.outcallRecordingCount = 0

  this.totalIncallsDuration = 0
  this.totalOutcallsDuration = 0
  this.inboundCallLocations = []
  this.outboundCallLocations = []

  this.faxInboundActions = []
  this.faxOutboundActions = []

  this.voiceInboundActions = []
  this.voiceOutboundActions = []

  this.faxInboundResults = []
  this.faxOutboundResults = []

  this.voiceInboundResults = []
  this.voiceOutboundResults = []

  var timeZone = parseInt($("#timezone").val(), 10);
  for (var i = 0; i<records.length; i++){
    try {
      var record = records[i]
      if (record.type == "Fax") {
        if (record.direction == "Inbound") {
          this.infaxCount += 1 // check
          this.totalInfaxesDuration += record.duration
          this.__addItemToExistingList(record.action, this.faxInboundActions)
          this.__addItemToExistingList(record.result, this.faxInboundResults)
        }else { // outbound fax.
          this.outfaxCount += 1 // check
          this.totalOutfaxesDuration += record.duration
          this.__addItemToExistingList(record.action, this.faxOutboundActions)
          this.__addItemToExistingList(record.result, this.faxOutboundResults)
        }
      }else{ // voice call
        if (record.direction == "Inbound") {
          this.incallCount += 1
          this.totalIncallsDuration += record.duration
          if (record.recording != undefined){
            this.incallRecordingCount += 1
          }
          this.__addItemToExistingList(record.action, this.voiceInboundActions)
          this.__addItemToExistingList(record.result, this.voiceInboundResults)
        }else{ // outbound call. Adjust start time with user's time zone
          this.outcallCount += 1
          this.totalOutcallsDuration += record.duration
          if (record.recording != undefined){
            this.outcallRecordingCount += 1
          }
          this.__addItemToExistingList(record.action, this.voiceOutboundActions)
          this.__addItemToExistingList(record.result, this.voiceOutboundResults)
        }
        this.voiceCallCount += 1
      }
      if (record.result == "Missed") {
        this.missedCallCount += 1
      }else if (record.result == "Voicemail"){
        this.voicemailCount += 1
      }
      if (record.from && record.from.hasOwnProperty('location')){
        var loc = {}
        loc['city'] = record.from.location
        loc['count'] = 1
        var add = true
        for (var n=0; n<this.inboundCallLocations.length; n++) {
          var item = this.inboundCallLocations[n]
          if (item.city == loc.city){
            this.inboundCallLocations[n].count += 1
            add = false
            break;
          }
        }
        if (add)
          this.inboundCallLocations.push(loc)
      }
      if (record.to && record.to.hasOwnProperty('location')){
        var loc = {}
        loc['city'] = record.to.location
        loc['count'] = 1
        var add = true
        for (var n=0; n<this.outboundCallLocations.length; n++) {
          var item = this.outboundCallLocations[n]
          if (item.city == loc.city){
            this.outboundCallLocations[n].count += 1
            add = false
            break;
          }
        }
        if (add)
          this.outboundCallLocations.push(loc)
      }
    }catch (ex) {
      alert(ex)
    }
  }
}

CallLogsData.prototype = {
  __convertTimeZone: function(gmtTime, timeZone) {
    var hour = parseInt(gmtTime, 10);
    hour = hour + timeZone
    if (hour < 0)
      hour = 24 + hour
    if (hour > 24)
      hour = hour - 24
    return hour
  },
  __createCallsDensity: function() {
    for (var n=0; n<24; n++){
      this.timeSliceInbound[n] = 0
      this.timeSliceOutbound[n] = 0
      this.timeSliceMissedCalls[n] = 0
      this.timeSliceVoicemails[n] = 0
    }
    var timeVal = $("#timezone").val()
    if (isNaN(timeVal)){
      alert("Please enter valid time zone")
      return
    }
    var timeZone = parseInt(timeVal, 10);
    for (var i=0; i<this.records.length; i++){
      var record = this.records[i]
      if (record.direction == "Inbound") {
        var twenty4hour = record.startTime.substring(11, 13)
        var hour = this.__convertTimeZone(twenty4hour, timeZone)
        this.timeSliceInbound[hour] += 1
      }else{ // outbound call. Adjust start time with user's time zone
        var twenty4hour = record.startTime.substring(11, 13)
        var hour = this.__convertTimeZone(twenty4hour, timeZone)
        this.timeSliceOutbound[hour] += 1
      }
      if (record.result == "Missed") {
        var twenty4hour = record.startTime.substring(11, 13)
        var hour = this.__convertTimeZone(twenty4hour, timeZone)
        this.timeSliceMissedCalls[hour] += 1
      }else if (record.result == "Voicemail"){
        var twenty4hour = record.startTime.substring(11, 13)
        var hour = this.__convertTimeZone(twenty4hour, timeZone)
        this.timeSliceVoicemails[hour] += 1
      }
    }
  },
  __addItemToExistingList: function(obj, objectList) {
    for (var t=0; t<objectList.length; t++){
      if (objectList[t].name == obj){
        objectList[t].count++
        return
      }
    }
    var type = {}
    type['name'] = obj
    type['count'] = 1
    objectList.push(type)
  },
  FaxVsVoiceGraph: function(w, h){
    var params = [];
    var arr = ['Voice vs. Fax', 'Type', { role: "style" } ];
    params.push(arr);

    var calls = this.incallCount + this.outcallCount
    item = ["Voice", this.voiceCallCount, "green"];
    params.push(item);

    var faxes = this.infaxCount + this.outfaxCount
    var item = ["Fax", faxes, "blue"];
    params.push(item);
    drawBarChart(w, h, params);
  },
  CallsFaxesByDirectionGraph: function(w, h){
    var params = [];
    var arr = ['Calls and Faxes by direction', 'Direction', { role: "style" } ];
    params.push(arr);
    var item = ["Inbound Call", this.incallCount, "blue"];
    params.push(item);

    item = ["Outbound Call", this.outcallCount, "green"];
    params.push(item);

    var item = ["Inbound Fax", this.infaxCount, "red"];
    params.push(item);

    item = ["Outbound Fax", this.outfaxCount, "brown"];
    params.push(item);

    drawBarChart(w, h, params);
  },
  CallsWithResultsGraph: function(w, h, type){
    var params = [];
    var index = 1
    if (type == "incall"){
      var arr = ['Inbound Calls with Results', 'Results', { role: "style" } ];
      params.push(arr);
      var total = ["Total", this.incallCount, colors[0]]
      params.push(total)
      for (var result of this.voiceInboundResults){
        var item = [result.name, result.count, colors[index]];
        index++
        params.push(item);
      }
    }else if (type == "outcall"){
      var arr = ['Outbound Calls with Results', 'Results', { role: "style" } ];
      params.push(arr)
      var total = ["Total", this.outcallCount, colors[0]]
      params.push(total)
      for (var result of this.voiceOutboundResults){
        var item = [result.name, result.count, colors[index]];
        index++
        params.push(item);
      }
    }else if (type == "infax"){
      var arr = ['Inbound Faxes with Results', 'Results', { role: "style" } ];
      params.push(arr);
      var total = ["Total", this.infaxCount, colors[0]]
      params.push(total)
      for (var result of this.faxInboundResults){
        var item = [result.name, result.count, colors[index]];
        index++
        params.push(item);
      }
    }else if (type == "outfax"){
      var arr = ['Outbound Faxes with Results', 'Results', { role: "style" } ];
      params.push(arr);
      var total = ["Total", this.outfaxCount, colors[0]]
      params.push(total)
      for (var result of this.faxOutboundResults){
        var item = [result.name, result.count, colors[index]];
        index++
        params.push(item);
      }
    }
    drawBarChart(w, h, params);
  },
  CallsWithActionsGraph: function(w, h, type){
    var params = [];
    var index = 1
    if (type == "incall"){
      var arr = ['Inbound Calls with Actions', 'Actions', { role: "style" } ];
      params.push(arr);
      var total = ["Total", this.incallCount, colors[0]]
      params.push(total)
      for (var result of this.voiceInboundActions){
        var item = [result.name, result.count, colors[index]];
        index++
        params.push(item);
      }
    }else if (type == "outcall"){
      var arr = ['Outbound Calls with Actions', 'Actions', { role: "style" } ];
      params.push(arr);
      var total = ["Total", this.outcallCount, colors[0]]
      params.push(total)
      for (var result of this.voiceOutboundActions){
        var item = [result.name, result.count, colors[index]];
        index++
        params.push(item);
      }
    }else if (type == "infax"){
      var arr = ['Inbound Faxes with Actions', 'Actions', { role: "style" } ];
      params.push(arr);
      var total = ["Total", this.infaxCount, colors[0]]
      params.push(total)
      for (var result of this.faxInboundActions){
        var item = [result.name, result.count, colors[index]];
        index++
        params.push(item);
      }
    }else if (type == "outfax"){
      var arr = ['Outbound Faxes with Actions', 'Actions', { role: "style" } ];
      params.push(arr);
      var total = ["Total", this.outfaxCount, colors[0]]
      params.push(total)
      for (var result of this.faxOutboundActions){
        var item = [result.name, result.count, colors[index]];
        index++
        params.push(item);
      }
    }
    drawBarChart(w, h, params);
  },
  MissedVoicemailGraph: function(w, h){
    var params = [];
    var arr = ['Total vs. Missed calls vs. Voicemail', 'Message', { role: "style" } ];
    params.push(arr);

    var item = ["Inbound", this.incallCount, "purple"];
    params.push(item);

    var item = ["Outbound", this.outcallCount, "brown"];
    params.push(item);

    item = ["Missed", this.missedCallCount, "blue"];
    params.push(item);

    item = ["Voicemail", this.voicemailCount, "green"];
    params.push(item);
    drawBarChart(w, h, params);
  },
  CallsByDirectionGraph: function(w, h){
    var params = [];
    var arr = ['Calls by direction', 'Direction', { role: "style" } ];
    params.push(arr);
    var item = ["Inbound", this.incallCount, "blue"];
    params.push(item);

    item = ["Outbound", this.outcallCount, "green"];
    params.push(item);
    drawBarChart(w, h, params);
  },
  CallsByDurationGraph: function(w, h){
    var params = [];
    var arr = ['Calls duration (min)', 'Duration', { role: "style" }];
    params.push(arr);
    item = ["Inbound", this.totalIncallsDuration/60, "blue"];
    params.push(item);

    item = [];
    var item = ["Outbound", this.totalOutcallsDuration/60, "green"];
    params.push(item);
    drawBarChart(w, h, params)
  },
  CallsByRecordingGraph: function(w, h){
    var params = [];
    var arr = ['Calls with recording', 'Recording', { role: "style" }];
    params.push(arr);
    item = ["Inbound Rec.", this.incallRecordingCount, "blue"];
    params.push(item);

    item = [];
    var item = ["Outbound Rec.", this.outcallRecordingCount, "green"];
    params.push(item);
    drawBarChart(w, h, params)
  },
  FaxesByDirectionGraph: function(w, h){
    var params = [];
    var arr = ['Faxes by direction', 'Direction', { role: "style" } ];
    params.push(arr);
    var item = ["Inbound", this.infaxCount, "blue"];
    params.push(item);

    item = ["Outbound", this.outfaxCount, "green"];
    params.push(item);
    drawBarChart(w, h, params);
  },
  FaxesByDurationGraph: function(w, h){
    var params = [];
    var arr = ['Faxes duration (min)', 'Duration', { role: "style" }];
    params.push(arr);
    item = ["Inbound", this.totalInfaxesDuration/60, "blue"];
    params.push(item);

    item = [];
    var item = ["Outbound", this.totalOutfaxesDuration/60, "green"];
    params.push(item);
    drawBarChart(w, h, params)
  },
  CallsDensityGraph: function(w, h){
    this.__createCallsDensity()
    params = [];
    var arr = ['Inbound Calls density', ''];
    params.push(arr);
    for (var t=0; t<24; t++){
      var item = [];
      item.push(t);
      item.push(this.timeSliceInbound[t]);
      params.push(item);
    }
    drawScatterChart(w, h, params, "Inbound Calls density")

    params = [];
    arr = ['Outbound Calls density', ''];
    params.push(arr);
    for (var t=0; t<24; t++){
      var item = [];
      item.push(t);
      item.push(this.timeSliceOutbound[t]);
      params.push(item);
    }
    drawScatterChart(w, h, params, "Outbound Calls density")

    params = [];
    arr = ['Missed Calls density', ''];
    params.push(arr);
    for (var t=0; t<24; t++){
      var item = [];
      item.push(t);
      item.push(this.timeSliceMissedCalls[t]);
      params.push(item);
    }
    drawScatterChart(w, h, params, "Missed Calls density")

    params = [];
    arr = ['Voicemail density', ''];
    params.push(arr);
    for (var t=0; t<24; t++){
      var item = [];
      item.push(t);
      item.push(this.timeSliceVoicemails[t]);
      params.push(item);
    }
    drawScatterChart(w, h, params, "Voicemails density")
  },
  CallsMapGraph: function(w, h){
    var params = [];
    var arr = ['City','Calls Count'];
    if ($("#onmap").val() == "inbound"){
      for (var loc1 of this.inboundCallLocations){
        var item = [];
        var inCity = loc1.city + ":" + loc1.count
        item.push(inCity);
        params.push(item);
      }
    }else if ($("#onmap").val() == "outbound"){
      for (var loc1 of this.outboundCallLocations){
        var item = [];
        var inCity = loc1.city + ":" + loc1.count
        item.push(inCity);
        params.push(item);
      }
    }else{
      for (var loc1 of this.inboundCallLocations){
        var item = [];
        var inCity = loc1.city + ":" + loc1.count
        item.push(inCity);
        params.push(item);
      }
      for (var loc1 of this.outboundCallLocations){
        var item = [];
        var inCity = loc1.city + ":" + loc1.count
        item.push(inCity);
        params.push(item);
      }
    }
    drawMapChart(w, h, params, "Call map")
  }
}

function refreshGraph() {
  drawGraphs()
}
function drawGraphs(){
  $("#timezone_block").hide()
  $("#map_block").hide()
  $("#graphs").empty()
  var selectedOption = $('#graphoption').val()
  if (selectedOption == 'callbytype'){
    var w = $(window).width();
    callLogsData.FaxVsVoiceGraph(w/2, w/4)
    callLogsData.CallsFaxesByDirectionGraph(w/2, w/4)
  }else if (selectedOption == 'callbyduration'){
    var w = $(window).width();
    callLogsData.CallsByDirectionGraph(w/3, w/4)
    callLogsData.CallsByDurationGraph(w/3, w/4)
    callLogsData.CallsByRecordingGraph(w/3, w/4)
  }else if (selectedOption == 'faxbyduration'){
    var w = $(window).width();
    callLogsData.FaxesByDirectionGraph(w/2, w/4)
    callLogsData.FaxesByDurationGraph(w/2, w/4)
  }else if (selectedOption == 'incallwithresults'){
    var w = $(window).width();
    if (callLogsData.incallCount <= 0) {
      alert("No inbound call during this period.")
      return
    }
    callLogsData.CallsWithResultsGraph(w-100, w/4, "incall")
  }else if (selectedOption == 'outcallwithresults'){
    var w = $(window).width();
    if (callLogsData.outcallCount <= 0) {
      alert("No outbound call during this period.")
      return
    }
    callLogsData.CallsWithResultsGraph(w-100, w/4, "outcall")
  }else if (selectedOption == 'infaxwithresults'){
    var w = $(window).width();
    if (callLogsData.infaxCount <= 0) {
      alert("No inbound fax during this period.")
      return
    }
    callLogsData.CallsWithResultsGraph(w-100, w/4, "infax")
  }else if (selectedOption == 'outfaxwithresults'){
    var w = $(window).width();
    if (callLogsData.outfaxCount <= 0) {
      alert("No outbound fax during this period.")
      return
    }
    callLogsData.CallsWithResultsGraph(w-100, w/4, "outfax")
  }else if (selectedOption == 'incallwithactions'){
    var w = $(window).width();
    if (callLogsData.incallCount <= 0) {
      alert("No inbound call during this period.")
      return
    }
    callLogsData.CallsWithActionsGraph(w-100, w/4, "incall")
  }else if (selectedOption == 'outcallwithactions'){
    var w = $(window).width();
    if (callLogsData.outcallCount <= 0) {
      alert("No outbound call during this period.")
      return
    }
    callLogsData.CallsWithActionsGraph(w-100, w/4, "outcall")
  }else if (selectedOption == 'infaxwithactions'){
    var w = $(window).width();
    if (callLogsData.infaxCount <= 0) {
      alert("No inbound fax during this period.")
      return
    }
    callLogsData.CallsWithActionsGraph(w-100, w/4, "infax")
  }else if (selectedOption == 'outfaxwithactions'){
    var w = $(window).width();
    if (callLogsData.outfaxCount <= 0) {
      alert("No outbound fax during this period.")
      return
    }
    callLogsData.CallsWithActionsGraph(w-100, w/4, "outfax")
  }else if (selectedOption == 'callsdensity'){
    $("#timezone_block").show()
    $("#map_block").hide()
    var w = $(window).width();
    callLogsData.CallsDensityGraph(w/4, w/6)
  }else if (selectedOption == 'callsmap'){
    $("#timezone_block").hide()
    $("#map_block").show()
    var w = $(window).width();
    callLogsData.CallsMapGraph(w, w/3)
  }
}

function readCallLogs(){
  var url = "readlogs?access=" + $('#access_level').val();
  var configs = {}
  if ($('#phoneNumber').val() != "")
    configs['phoneNumber'] = $('#phoneNumber').val()
  if ($('#extension').val() != "")
    configs['extensionNumber'] = $('#extension').val()

  if ($('#direction').val() != "default")
    configs['direction'] = $('#direction').val()
  if ($('#type').val() != "default")
    configs['type'] = $('#type').val()
  if ($('#transport').val() != "default")
    configs['transport'] = $('#transport').val()

  configs['view'] = $('#view').val()

  configs['showBlocked'] = $('#showBlocked').is(":checked")
  configs['withRecording'] = $('#withRecording').is(":checked")
  configs['dateFrom'] = $("#fromdatepicker").val() + "T00:00:00.000Z"
  configs['dateTo'] = $("#todatepicker").val() + "T23:59:59.999Z"
  configs['perPage'] = 1000

  var posting = $.post( url, configs );
  posting.done(function( response ) {
    var res = JSON.parse(response)
    if (res.hasOwnProperty('calllog_error')){
      alert(res.calllog_error)
    }else{
      callLogsData = new CallLogsData(JSON.parse(response))
      drawGraphs()
    }
  });
  posting.fail(function(response){
    alert(response.statusText);
  });
}

function drawPieChart(params)
{
    var data = google.visualization.arrayToDataTable(params);

    var options = {
        title: params[0][0],
        pieSliceText: 'value',
        legend: 'both',
        pieHole: 0.4,
    };
    var element = document.createElement("span");
    element.setAttribute("style", "display:inline;");
    $("#graphs").append(element)
    var chart = new google.visualization.PieChart(element);
    chart.draw(data, options);
}

function drawBarChart(w, h, params)
{
    var data = google.visualization.arrayToDataTable(params);
    var view = new google.visualization.DataView(data);
    view.setColumns([0, 1,
                    { calc: "stringify",
                       sourceColumn: 1,
                       type: "string",
                       role: "annotation"
                    },
                    2]);

    var options = {
      title: params[0][0],
      width: w,
      height: h,
      bar: {groupWidth: "95%"},
      legend: { position: "none" },
    };

    var td = document.createElement("td");
    var element = document.createElement('div')
    td.append(element)
    $("#graphs").append(td)
    var chart = new google.visualization.ColumnChart(element);
    chart.draw(view, options);
}

function drawScatterChart(w, h, params, title) {
    var data = google.visualization.arrayToDataTable(params);
    var options = {
      title: title,
      width: w,
      height: h,
      hAxis: {title: '24-Hour'},
      vAxis: {title: 'Calls'},
      pointShape: 'diamond',
      legend: 'none',
    };

    var td = document.createElement("td");
    var element = document.createElement('div')
    td.append(element)
    $("#graphs").append(td)
    var chart = new google.visualization.ScatterChart(element);
    chart.draw(data, options);
}

function drawMapChart(w, h, params, title) {
    var data = google.visualization.arrayToDataTable(params);
    var options = {
      width: w,
      height: h,
      zoomLevel: 5,
      showTooltip: true,
      showInfoWindow: true,
    };
    var td = document.createElement("td");
    var element = document.createElement('div')
    td.append(element)
    $("#graphs").append(td)
    var map = new google.visualization.Map(element);
    map.draw(data, options);
}
