const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const Schema = mongoose.Schema;
const config = require("config");

const ConsumerModel = {
  "InstallId": { type: String, required: true },
  "CallbackUrl": { type: String, required: true },
  "UserId": { type: String, required: true },
  "UserName": { type: String, required: true },
  "SiteId": { type: String, required: true },
  "SiteName": { type: String, required: true },
  "refresh_token": { type: String },
  "access_token": { type: String },
  "eloqua_base_url": { type: String },
  "LastLogin": { type: Date },
  "DateEnabled": { type: Date },
  "DateDisabled": { type: Date },
  "DateConfigured": { type: Date },
  "status": { type: String, default: 'enabled' }
};

let connection = mongoose.createConnection(config.mongodburl,{useNewUrlParser: true});
let ConsumerSchema = new Schema(ConsumerModel,{collection: 'Consumer',versionKey: false});
let consumer = connection.model('Consumer',ConsumerSchema);

let db = {
  Consumer: consumer
};

module.exports = function(emitter){
  
  emitter._dbConnection = connection;
  
  emitter.registerHook('db::upsert',function(options){
         
    return new Promise(function(resolve,reject){
      if(db[options.table]){
        db[options.table].findOneAndUpdate(options.condition, options.content, {new: true, upsert: true, rawResult: true},function(err,result){
          if(err){
            reject(err);
          }
          if(result){
            let content = JSON.parse(JSON.stringify(result));
            let mContent = content.value;
            mContent.updatedExisting = content.lastErrorObject.updatedExisting;
            resolve(mContent);
          }
        });
      }
      else{
        reject("TABLE_NOT_FOUND");
      }
    });
  });
  
  emitter.registerHook('db::create',function(options){
         
    return new Promise(function(resolve,reject){
      if(db[options.table]){
        db[options.table].create(options.content,function(err,result){
          if(err){
            reject(err);
          }
          if(result){
            resolve(result);
          }
        });
      }
      else{
        reject("TABLE_NOT_FOUND");
      }
    });

  });

  emitter.registerHook('db::find',function(options){
         
    return new Promise(function(resolve,reject){
      if(db[options.table]){
        if(options.content._id){
          options.content._id = ObjectId(options.content._id);
        }
        db[options.table]
          .find(options.content)
          .skip(options.skip || 0)
          .limit(options.limit || 100)
          .sort(options.sort || {})
          .exec(function(err,result){
            if(err){
              reject(err);
            }
            if(result){
              resolve(result);
            }
          });
      }
      else{
        reject("TABLE_NOT_FOUND");
      }
    });

  });

  emitter.registerHook('db::update',function(options){
         
    return new Promise(function(resolve,reject){
      if(db[options.table]){
        let item = JSON.parse(JSON.stringify(options.content));
        delete item._id;
        db[options.table]
          .updateOne({"_id" : ObjectId(options.content._id)},{$set:item},{multi: true},function(err,result){
            if(err){
              reject(err);
            }
            if(result){
              resolve(result);
            }
          });
      }
      else{
        reject("TABLE_NOT_FOUND");
      }
    });

  });

  emitter.registerHook('db::update::bulk',function(options){
         
    return new Promise(function(resolve,reject){
      if(db[options.table]){
        var Bulk = db[options.table].collection.initializeUnorderedBulkOp();
        options.content.forEach(function(content){
          let item = JSON.parse(JSON.stringify(content));
          delete item._id;
          Bulk.find({ "_id": ObjectId(content._id) })
              .update({
                "$set": item
              });
        })
        Bulk.execute(function(err,result){
          if(err){
            reject(err);
          }
          if(result){
            resolve(result);
          }
        });
      }
      else{
        reject("TABLE_NOT_FOUND");
      }
    });

  });

  emitter.registerHook('db::remove::bulk',function(options){
         
    return new Promise(function(resolve,reject){
      if(db[options.table]){
        var Bulk = db[options.table].collection.initializeUnorderedBulkOp();
        options.content.forEach(function(content){
          Bulk.find({ "_id": ObjectId(content._id) })
              .remove();
        })
        Bulk.execute(function(err,result){
          if(err){
            reject(err);
          }
          if(result){
            resolve(result);
          }
        });
      }
      else{
        reject("TABLE_NOT_FOUND");
      }
    });

  });

  emitter.registerHook('db::insertMany',function(options){
         
    return new Promise(function(resolve,reject){
      if(db[options.table]){
        db[options.table].insertMany(options.content,function(err,result){
          if(err){
            reject(err);
          }
          if(result){
            resolve(result);
          }
        });
      }
      else{
        reject("TABLE_NOT_FOUND");
      }
    });

  });
  
};