var RC = require('ringcentral')
require('dotenv').load()

var rcsdk = new RC({
    server: RC.server.sandbox,
    appKey: process.env.CLIENT_ID,
    appSecret: process.env.CLIENT_SECRET
  })

var platform = rcsdk.platform()

var engine = module.exports = {
    login: function(req, res){
      platform.login({
        username:process.env.USERNAME,
        password:process.env.PASSWORD
      })
      .then(function(resp){
        res.render('index')
      })
      .catch(function(e){
        throw e
      })
    },
    readCallLogs(req, res){
      var endpoint = ""
      if (req.query.access == "account")
        endpoint = '/account/~/call-log'
      else
        endpoint = '/account/~/extension/~/call-log'

      platform.get(endpoint, req.body)
      .then(function(resp){
        var json = resp.json()
        if (process.env.PRINT_LOG == "yes"){
          for (var record of json.records){
            console.log(JSON.stringify(record))
            console.log("------")
          }
        }
        res.send(JSON.stringify(json.records))
      })
      .catch(function(e){
        var errorRes = {}
        var err = e.toString();
        if (err.includes("ReadCompanyCallLog")){
          errorRes['calllog_error'] = "You do not have admin role to access account level. You can choose the extension access level."
          res.send(JSON.stringify(errorRes))
        }else{
          errorRes['calllog_error'] = "Cannot access call log."
          res.send(JSON.stringify(errorRes))
        }
        console.log(err)
      })
    }
}
