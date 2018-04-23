"use strict";
var async = require('async');
require('dotenv').config();
var googleMapsClient = require('@google/maps').createClient({
  key: process.env.KEY
}, function (x) { console.log(x) });

// Geocode an address.
var address = process.env.START_APT;
var radius = process.env.radius;
var keyword = process.env.KEYWORD;
var step1Results = new Set();
getAllPlaces(address, radius, keyword, function (result) {
  
  if (!result) {
    console.log("no results");
  }
  else {
    //console.log('Result Size' + result.size);
    //console.log('Results before maplimit start', result);
    async.mapLimit(result, 2, async.reflect(function (x, cb) {
      //console.log(":::" + x.loc + ":::" + x.name);
      //radius=1000;
     
      radius=Math.floor((Math.random() * 10) + 1) *1000;
      getAllPlacesNearLoc(x.loc, radius, keyword, function (err, res) {
        if (err) {
          console.log('returning error ' + err + err.size + typeof err);
          return cb(err);
        }
        cb(null, res);
      });
    }), function (err, results) {
      
      results.forEach(function (eachResult, i) {
        if (eachResult.error) {
          //console.log("handle error " + eachResult.error);
        } else {
          //console.log("i: " + i + " eachResult.value" + eachResult.value)
          if (eachResult.value) {
            //console.log('size adding up0  ' + eachResult.value.size + " " + step1Results.size);
            concatSets(step1Results, eachResult.value);
          }

        }
      });
      if (step1Results.size > 0) {
        async.mapLimit(step1Results, 2, async.reflect(function (x, cb) {
          //console.log(":::" + x.loc + ":::" + x.name);
          //vary the radius.
          radius=Math.floor((Math.random() * 1) + 1) *1000;
          //radius=1500;
          getAllPlacesNearLoc(x.loc, radius, keyword,function (err, res) {
            if (err) {
              console.log('returning error ' + err + err.size + typeof err);
              return cb(err);
            }
            return cb(null, res);
          });

        }), function (err, results) {
          // err will always be null now
          let step2Results = new Set();
          results.forEach(function (eachResult, i) {
            if (eachResult.error) {
              console.log("handle error " + eachResult.error);

            } else {

              //console.log("i" + i + " " + "val " + eachResult.value);
              if (eachResult.value) {
                //console.log('size adding up1  ' + eachResult.value.size + " " + step2Results.size);
                concatSets(step2Results, eachResult.value);
              }

            }
          });

          let finalResult = new Set();
          concatSets(finalResult, result, step1Results, step2Results);
          console.log("final result *************************************");
          console.log(finalResult);

        }
        );
      }
      else {
        concatSets(step1Results, result)
        console.log("final result1 *************************************");
        console.log(step1Results);
      }

    });
  }
});

function getAllPlacesNearLoc(loc, radius, keyword,  callback1) {
  var query;
    query = {
      location: loc,
      radius: radius,
      keyword: keyword
    };

  let combineResults = new Set();
  var result1, result2, result3;

  callMap(query, function (result) {
    console.log('result is ' + result);
    if (!(result.result)) {
      //if result is null .
      return callback1(null, null);
    }
    else {
      // return value is here
      console.log(result.query);
      console.log('Level1');

      result1 = result.result;

      if (result.query) {
        setTimeout(() => {
          callMap(query, function (result) {
            if (!(result.result)) {

              return callback1(null, null);
            }

            console.log('Level2');

            result2 = result.result;
            if (result.query) {
              setTimeout(() => {
                callMap(query, function (result) {
                  if (!(result.result)) {
      
                    return callback1(null, null);
                  }
      
                  console.log('Level3');
      
                  result3 = result.result;
                  concatSets(result1, result2,result3);
                  callback1(null, result1);
                });
              }, 2000);
            }
            concatSets(result1, result2);
            callback1(null, result1);
          });
        }, 2000);
      }

      else {
        callback1(null, result1);
      }
    }
  });


}

function getAllPlaces(address, radius, keyword, callback1) {
  googleMapsClient.geocode({
    address: address,
  }, function (err, response) {
    if (!err) {
      var query = {
        location: response.json.results[0].geometry.location,
        radius: radius,
        keyword: keyword
      };
      let combineResults = new Set();
      var result1, result2, result3;

      callMap(query, function (result) {
        // return value is here
        if (result) {
          console.log('level1' + result.result + "*************");
          result1 = result.result;
          //if query is not null  , call it again .this will get the next page of results.
          if (result.query) {
            setTimeout(() => {
              callMap(query, function (result) {
                if (result) {
                  result2 = result.result;

                  console.log('level2' + result.result + "*************");
                  if (result.query) {
                    setTimeout(() => {
                      callMap(query, function (result) {

                        result3 = result.result;
                        concatSets(result1, result2, result3);

                        callback1(result1);
                      });
                    }, 2000);

                  }
                  else {
                    callback1(result2);
                  }
                }
                else {
                  callback1(null);
                }
              }

              );
            }, 2000);

          }
          else {
            callback1(result1);
          }
        }
        else {
          callback1(null);
        }
      });

      console.log('dsffg');


    }
    else callback1(null);
  });
}

function setHas(set, value) {
  var has = false;
  set.forEach(function (element) {
    if ((element.name === value.name) && (element.loc.lat === value.loc.lat) && (element.loc.lng === value.loc.lng)) {
      has = true;
    }
  });
  return has;
}

function checkAndAdd(set, name) {
  var found = setHas(set, name)
  if (!found) {
    set.add(name);
  }
}
function addOnlyIfNotFound(name, AddtoSet, ...sets) {
  let found = false;
  for (const one_set of sets) {
    if (setHas(one_set, name)) {
      found = true;
      break;
    }
  }
  if (found == false) {
    AddtoSet.add(name);
  }

}

function concatSets(set, ...iterables) {
  for (const iterable of iterables) {
    for (const item of iterable) {
      checkAndAdd(set, item);
      //set.add(item);
    }
  }
}





async function callMap(query, callback) {
  //console.log('query' + JSON.stringify(query, null, 4));
  console.log('stp'+step1Results);
  try {
    await googleMapsClient.placesNearby(query, function (err, response) {

      if (err) {
        console.log('what happpppp' + JSON.stringify(err, null, 4));
        if (err.json) {
          if (err.json.status) {
            if (err.json.status == 'INVALID_STATUS') {
              return callMapAfter2Sec();
            }
            else {
              console.log('returning from here');
              return callback({ "result": null, "query": null });
            }
          }
        }
        console.log('returning from here1');
        return callback({ "result": null, "query": null });
      }
      else {
        console.log('what happ Response status' + response.status);
        let result = new Set();
        if (response.status === 200) {
          console.log('what happ Response status1  :' + response.json.status);

          var json_obj
          if (response.json.results) {
            json_obj = response.json.results;
          }
          for (let i in json_obj) {
            console.log(json_obj[i].name);
            addOnlyIfNotFound( { 'name': json_obj[i].name, 'loc': json_obj[i].geometry.location },result,step1Results);

          }
          if (response.json.next_page_token) {

            query.pagetoken = response.json.next_page_token;
          }
          else {
            query = null;
          }
        }
        else {
          console.log('what happ3' + response.status);
        }


        callback({ "result": result, "query": query });
      }
    });
  }
  catch (e) {
    console.log("e  " + e);
    return callback({ "result": null, "query": null });
  }
}