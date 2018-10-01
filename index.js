
var pm2 = require('pm2')
var request = require('request')
var forEachLimit = require('async/forEachLimit')
var semver = require('semver')

function checkIfNewVersion(cb) {
  var modules = {}

  pm2.list(function(err, list) {

    // List all modules retrieved from internet
    list.forEach(proc => {
      if (proc.pm2_env.install_url) {
        var unique_name = proc.name.split(':')[0]
        modules[unique_name] = proc
      }
    })

    forEachLimit(Object.keys(modules), 1, (module_name, next) => {
      var module = modules[module_name]

      var module_url = module.pm2_env.install_url
      var version = module.pm2_env.version

      request(`${module_url}/details`, function(err, res, body) {
        if (err) {
          console.error(err)
          return next()
        }

        body = JSON.parse(body)
        var versions = body.versions
        var new_version = versions[versions.length - 1].name

        if (semver.gt(new_version, version)) {
          console.log(`Installing newer version of ${module.name} from ${version} to ${new_version}`)
          pm2.install(module_url, (err) => {
            if (err) {
              console.error(err)
            }
            return next()
          })
        }
        else
          next()
      })
    }, () => {
      console.log('Module check done')
      cb()
    })

  })
}

function startWorker() {
  checkIfNewVersion(function() {
    setTimeout(startWorker, 20000)
  })
}

startWorker()
