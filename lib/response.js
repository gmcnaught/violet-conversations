
/** @class */
module.exports = class Response {
  constructor(convoEngine, requ, resp, paramsStore, sessionStore) {
    this.convoEngine = convoEngine;
    this.requ = requ;
    this.resp = resp;
    this.paramsStore = paramsStore;
    this.sessionStore = sessionStore;
  }

  // so that users can try out cuting edge features - using this will possibly limit support for AWS Lex, Google Home, etc.
  _alexa_request() {return this.requ;}
  _alexa_response() {return this.resp;}

  // for advanced users
  _paramsStoreReal() {return this.paramsStore;}
  _paramsStore() {return this.sessionStore;} // we are phasing out easy access to anything but the session store
  _sessionStore() {return this.sessionStore;}
  _persistentStoreReal() {return this.convoEngine.persistentStore;}
  _persistentStore() {return this.sessionStore;} // we are phasing out easy access to anything but the session store

  /**
   * Responds to the user. When an array is provided Violet picks a
   * random item - this allows responses to not be repetitive. Additionally
   * you can add input parameters directly in the response by adding them
   * in [[]]
   *
   * @example
   *  response.say('Hello')
   *  response.say(['Hello', 'Hi'])
   *  response.say('I like the name [[name]]')
   * @param {string[]} potResponses - response or array of potential
   * responses for the user
   * @param {boolean} [quick=false] - do not put a pause between the
   * previous say statement and this one
   */
  say(potResponses, quick=false) {this.convoEngine._say(this, potResponses, quick)}

  /**
   * Asks the user a question. Items being asked are placed after the say
   * statements. Additionally, only one ask is done at a time, giving the
   * user time to respond.
   *
   * @param {string[]} potResponses - response or array of potential
   * questions for the user
   */
  ask(potResponses) {this.convoEngine._ask(this, potResponses)}

  /**
   * Ends the conversation after the response. By default Violet assumes
   * that you want to keep the conversation open.
   *
   * @default keepConversationRunning=true
   */
  endConversation() {this.convoEngine.keepConversationRunning=false}

  __matchAgainstStore(varStr, rePattern) {
    var varMatch = rePattern.exec(varStr);
    if (varMatch == null) return {matched: false};
    return {matched: true, varMatch: varMatch};
  }
  __getStoreVarUsingMatched(matchResult) {
    return matchResult.varMatch[1];
  }
  __containsUsingMatched(matchResult, storeType) {
    var storeVar = this.__getStoreVarUsingMatched(matchResult);
    if (storeType.contains) {
      return storeType.contains(storeVar);
    } else {
      return storeType.get(storeVar) != undefined;
    }
  }
  __getUsingMatched(matchResult, storeType) {
    var storeVar = this.__getStoreVarUsingMatched(matchResult);
    return storeType.get(storeVar);
  }
  __isStorageParamClassed(varStr) {
    return varStr.startsWith('[[') || varStr.startsWith('{{') || varStr.startsWith('<<');
  }
  contains(varStr) {
    if (!this.__isStorageParamClassed(varStr)) return (this.sessionStore.get(varStr) != undefined);

    var getResult = this.__matchAgainstStore(varStr, paramsRE);
    if (getResult.matched) return this.__containsUsingMatched(getResult, this.sessionStore);

    console.log(`*** Cannot process param: ${varStr} ***`);
    return false;
  }

  /**
   * Gets parameter from the user
   *
   * @example
   *  violet.respondTo({
   *    expecting: 'My age is [[age]]',
   *    resolve: (response) => {
   *      var age = response.get('age');
   *      if (age && age<17)
   *        response.say('I need to be careful, you are a minor');
   *      else
   *        response.say('Good to meet you. I will remember the you are [[age]]');
   *  }});
   *
   * @param {string} varStr - variable name
   */
  get(varStr) {
    if (!this.__isStorageParamClassed(varStr)) return this.sessionStore.get(varStr);

    var getResult = this.__matchAgainstStore(varStr, paramsRE);
    if (getResult.matched) return this.__getUsingMatched(getResult, this.sessionStore);

    return "store type not found";
  }

  /**
   * Sets parameter value for access later
   *
   * @param {string} varStr - variable name
   * @param {Object} val - value attached to the variable
   */
  set(varStr, val) {
    if (!this.__isStorageParamClassed(varStr)) return this.sessionStore.set(varStr, val);

    var varMatch = paramsRE.exec(varStr);
    if (varMatch != null) {
      console.log('Setting session variable: ' + varMatch[1] + ' <-- ' + val);
      return this.sessionStore.set(varMatch[1], val);
    }

    return "store type not found";
  }

  /**
   * Clears parameter that might have been gotten from the user
   *
   * @param {string} varStr - variable name
   */
  clear(varStr) {
    if (!this.__isStorageParamClassed(varStr)) return this.sessionStore.clear(varStr);

    var varMatch = paramRE.exec(varStr);
    if (varMatch != null) {
      console.log('Setting session variable: ' + varMatch[1] + ' <-- ' + val);
      return this.sessionStore.clear(varMatch[1]);
    }

    return "store type not found";
  }

  // persistence support
  /*
    params - passed in as an object:
      objName <-- object being queried
      propOfInterest <-- fields that we want to do a 'select' on (also can use the global values)
      keyName, keyVal, filter <-- items for the 'where' clause
      queryXtra <-- additional items like 'limit'
      query <-- for sql experts

    alternatively, can pass in params as: objName, keyName, keyVal, filter, queryXtra
  */
  load(params) {
    if (arguments.length>1) {
      var p = {};
      if (arguments[0]) p.objName   = arguments[0];
      if (arguments[1]) p.keyName   = arguments[1];
      if (arguments[2]) p.keyVal    = arguments[2];
      if (arguments[3]) p.filter    = arguments[3];
      if (arguments[4]) p.queryXtra = arguments[4];
      return this.load(p);
    }

    if (!params.objName && !params.query) {
      console.log('Need object or query to load');
      return Promise.resolve();
    }

    if (!params.query) params.query = ''
    if (!params.queryXtra) params.queryXtra = ''
    if (params.query.toLowerCase().indexOf('limit') == -1 &&
          params.queryXtra.toLowerCase().indexOf('limit') == -1)
      params.queryXtra += ' limit 100';

    if (params.objName)
      console.log('Loading object: ' + params.objName);
    else
    console.log('Loading: ', params);
    return this.convoEngine.persistentStore.load(params);
  }
  store(objName, dataToStore) {
    console.log('Storing object: ' + objName);
    return this.convoEngine.persistentStore.store(objName, dataToStore);
  }
  update(objName, keyName, keyVal, updateData) {
    console.log('Updating object: ' + objName);
    return this.convoEngine.persistentStore.update(objName, keyName, keyVal, updateData);
  }
  delete(objName, keyName, keyVal, deleteData) {
    console.log('Deleting object: ' + objName);
    return this.convoEngine.persistentStore.delete(objName, keyName, keyVal, deleteData);
  }

  // goals support

  /**
   * Tells Violet that a goal needs to be met. These goals can be checked
   * to see if they are set by calling *hasGoal* and can be cleared by
   * calling *clearGoal*.
   * <br><br>
   * Once called Violet will call any defined goals after the current
   * *resolve* method finishes.
   */
  addGoal(goal) {this.convoEngine._addGoal(goal);}

  /**
   * Checks if a goal has been set.
   */
  hasGoal(goal) {return this.convoEngine._hasGoal(goal);}

  /**
   * Clears goals
   */
  clearGoal(goal) {this.convoEngine._clearGoal(goal);}

  /**
   * Clears all goals
   */
  clearAllGoals() {this.convoEngine._clearAllGoals();}
  goalFilledByStore(destParamName, srcParamName) {
    if (this.contains(destParamName)) {
      return true;
    }
    if (srcParamName && srcParamName!=destParamName && this.contains(srcParamName)) {
      this.set(destParamName, this.get(srcParamName));
      return true;
    }
    console.log('*** param not found');
    return false;
  }
  isGoalFilled(paramName) {
    return this.goalFilledByStore(paramName);
  }
  ensureGoalFilled(paramName) {
    var success = this.goalFilledByStore(paramName);
    if (!success) this.addGoal(paramName);
    return success;
  }
}