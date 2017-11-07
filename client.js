/* global TrelloPowerUp */

var Promise = TrelloPowerUp.Promise;

var SIGMA_ICON = './sigma.svg';

var getBadges = function(t){
  // we used to store costs in a board-level object, but 
  // https://github.com/webrender/trello-costello/issues/11
  // reported that the length of the field could exceed the 
  // 4,000 character limit for trello data.  costs are now stored
  // in card level objects, and this is here to convert old board-
  // level costs to the new card-level objects
  return t.card('id')
  .then(function(card) {
  return t.get('board', 'shared', 'costs')
  .then(function(oldCosts) {
    var returnCosts = function () {
      return t.get('card', 'shared', 'costs')
      .then(function(costs){
      return t.get('board', 'shared', 'costFields')
      .then(function(costFields){
        var badges = [];
        if (!costFields) {
          // create array
          var newCostFields = ['Total Cost'];
          return t.set('board', 'shared', 'costFields', newCostFields)
          .then(function() {
            return getBadges(t);
          });
        }
        if (costs) {
          if(Array.isArray(costs)) {
            costs.forEach(function(cost, idx){
              if (cost) {
                badges.push({
                  text: costFields[idx] + ': ' + parseFloat(cost).toLocaleString(undefined,{minimumFractionDigits:2}),
                  color: (cost == 0) ? 'red' : null
                });
              }
            }); 
            return badges;
          } else {
            // Initially, the card-level object used the cost title as the key,
            // but I realized this would cause issues when renaming titles.
            // costs are now stored in an array of objects, where the first object
            // is always the default title.
            var newCostArray = [];
            newCostArray.push(costs['Total Cost']);
            return t.set('card', 'shared', 'costs', newCostArray)
            .then(function() {
              return getBadges(t);              
            });
          }
        } else {
          return [];
        }
      });
      });
    }
    // oldcosts: these are legacy costs from v1 that were stored on the board-level object
    if (oldCosts && oldCosts[card.id]) {
      return t.set('card', 'shared', 'costs', [oldCosts[card.id]])
      .then(function() {
        delete oldCosts[card.id];
        return t.set('board', 'shared', 'costs', oldCosts)
        .then(function() {
          return returnCosts();
        });
      })
    } else {
      return returnCosts();
    }
  });
  });
};


var getBoardButtons = function(t) {
  // get all the cards
  return t.get('board', 'shared', 'costFields')
  .then(function(costFields) {
  return t.cards('id', 'name', 'idList', 'labels')
  .then(function(cards) {
    var getCosts = [];
    // get all the card costs
    cards.forEach(function(card){
      getCosts.push(t.get(card.id, 'shared', 'costs'))
    });
    return Promise.all(getCosts)
    .then(function(costArray) {
      var sums = Array(costFields.length).fill(0);
      // for each card
      costArray.forEach(function(cardCosts) {
        // for each cost on the card
        if (cardCosts && Array.isArray(cardCosts)) {
          cardCosts.forEach(function(cost,idx) {
            if(cost)
              sums[idx] += parseFloat(cost);
          });
        }
      });
      var boardButtons = [];
      sums.forEach(function(sum, idx) {
        boardButtons.push({
          icon: SIGMA_ICON,
          text: costFields[idx] + ': ' + parseFloat(sum).toLocaleString(undefined,{minimumFractionDigits:2}),
          callback: function(t) {
            return t.lists('id', 'name')
            .then(function(lists){
              var entries = [];
              var activeIds = cards.map(function(card){return card.id;});
              
              var summaryByColumn = function(t) {
                var listSums = {};
                var columnEntries = [];
                costArray.forEach(function(cardCosts, cardIdx) {
                  if (cardCosts && cardCosts.length > 0) {
                    var cardId = cards[cardIdx].id;
                    // for each active card
                    if (activeIds.indexOf(cardId) > -1) {
                      // if it has this cost attached
                      if (cardCosts[idx]) {
                        // see if listSums already has a sum under this listId
                        if (!listSums[cards[cardIdx].idList]) {
                          // if not create it
                          listSums[cards[cardIdx].idList] = 0;
                        }
                        // add the cost to the list sum
                        listSums[cards[cardIdx].idList] += parseFloat(cardCosts[idx]);
                      }
                    }
                  }
                });
                Object.keys(listSums).forEach(function(listId) {  
                  var listName = lists.find(function(list){return listId == list.id}).name;
                  columnEntries.push({
                    text: listName + ': ' + parseFloat(listSums[listId]).toFixed(2).toLocaleString(undefined,{minimumFractionDigits:2})
                  });
                });
                return t.popup({
                  title: 'Summary by Column',
                  items: columnEntries
                });
              }

              var summaryByLabel = function(t) {
                var listSums = {};
                var columnEntries = [];
                cards.forEach(function(card, cardIdx){ 
                  if (card.labels.length > 0) {
                    card.labels.forEach(function(label) {
                      if (listSums[label.name]) {
                        listSums[label.name] += parseFloat(costArray[cardIdx][idx])
                      } else {
                        listSums[label.name] = parseFloat(costArray[cardIdx][idx])
                      }
                    });
                  }
                });

                for (var listSum in listSums) {        
                  columnEntries.push({text: listSum + ': ' + parseFloat(listSums[listSum]).toFixed(2).toLocaleString(undefined,{minimumFractionDigits:2})});
                }
                return t.popup({
                  title: 'Summary by Label',
                  items: columnEntries
                });
              }
              
              entries.push({text: '🔍 Summary by Column...', callback: summaryByColumn});
              entries.push({text: '🔍 Summary by Label...', callback: summaryByLabel});
              costArray.forEach(function(cardCosts, cardIdx) {
                if (cardCosts && cardCosts.length > 0 && cardCosts[idx]) {
                  var cost = cards[cardIdx].id;
                  if (activeIds.indexOf(cost) > -1) {
                    var cb = function(a){t.showCard(a);};
                    entries.push({              
                        text: parseFloat(cardCosts[idx]).toLocaleString(undefined,{minimumFractionDigits:2}) + ' - ' + cards.find(function(card){return card.id == cost;}).name,
                        callback: cb.bind(null, cost)
                    });
                  }
                }
              });
              
              return t.popup({
                title: 'Cost Summary',
                items: entries
              });
            });
          }
        });
      });
      return boardButtons;
    });
  });
  });
}

var getSettings = function(t) {
  return t.get('board', 'shared', 'costFields')
  .then(function(costFields) {
    return t.popup({
      title: 'Manage Cost Fields',
      items: function(t, options) {
        var buttons = [{
          text: options.search !== '' ? 'Add cost field: ' + options.search : '(Enter a title to add cost field)',
          callback: function(t) {
            costFields.push(options.search);
            return t.set('board', 'shared', 'costFields', costFields)
            .then(function() {
              return getSettings(t);
            });
          }
        }];
        if (costFields && Array.isArray(costFields) && costFields.length > 0) {
          costFields.forEach(function(costField, idx) {
            buttons.push({
              text: costField,
              callback: function(t) {
                return t.popup({
                  title: 'Set Field Name',
                  items: function(t, subopt) {
                    return [{
                      text: subopt.search !== '' ? 'Rename field to "' + subopt.search + '"': '(Enter a new name for this field.)',
                      callback: function(t) {
                        costFields[idx] = subopt.search;
                        return t.set('board', 'shared', 'costFields', costFields)
                        .then(function() {
                          return getSettings(t);             
                        });
                      }
                    }, {
                      text: 'Delete ' + costField + ' field.',
                      callback: function(t) {
                        // not only do we need to delete this field from the costField array, 
                        // we also need to delete that index from any card-level costs object
                        return t.cards('id')
                        .then(function(cards) {
                          var requests = [];
                          cards.forEach(function(card) {
                            requests.push(t.get(card.id, 'shared', 'costs'));
                          });
                          return Promise.all(requests)
                          .then(function(cardCostsArray) {
                            if (cardCostsArray) {
                              var updates = [];
                              cardCostsArray.forEach(function(cardCosts, cardIdx) {
                                if (cardCosts && cardCosts[idx]) {
                                  cardCosts[idx] = false;
                                }
                                updates.push(t.set(cards[cardIdx].id, 'shared', 'costs', cardCosts));
                              });
                              if (updates) {
                                return Promise.all(updates)
                                .then(function() {
                                  costFields.splice(idx, 1);
                                  return t.set('board', 'shared', 'costFields', costFields)
                                  .then(function(){
                                    return getSettings(t);                                   
                                  });
                                });
                              } else {
                                costFields.splice(idx, 1);
                                return t.set('board', 'shared', 'costFields', costFields)
                                .then(function(){
                                  return getSettings(t);                                   
                                });
                              }
                            } else {
                              costFields.splice(idx, 1);
                              return t.set('board', 'shared', 'costFields', costFields)
                              .then(function(){
                                return getSettings(t);                                   
                              });
                            }
                          });
                        });
                      }
                    }]
                  },
                  search: {
                    placeholder: costFields[0]
                  }
                });
              }
            });
          });
        }
        return buttons;
      },
      search: {
        placeholder: 'Enter new cost field',
        empty: 'Error',
        searching: 'Processing...'
      }
    });
  });
}

var getButtons = function(t) {
  return t.get('board', 'shared', 'costFields')
  .then(function(costFields){
  return t.get('card', 'shared', 'costs')
  .then(function(costs){
    var buttons = [];  
    costFields.forEach(function(cost, idx){
      buttons.push({
        icon: SIGMA_ICON, 
        text: costs && costs[idx] ? costFields[idx] + ': ' + parseFloat(costs[idx]).toLocaleString(undefined,{minimumFractionDigits:2}) :'Add ' + costFields[idx] + '...',
        callback: t.memberCanWriteToModel('card') ? function(t) {
          return t.popup({
            title: 'Set ' + costFields[idx] + '...',
            items: function(t, options) {
              var newCost = parseFloat(options.search).toFixed(2)
              var buttons = [{
                text: !Number.isNaN(parseFloat(options.search)) ? 'Set ' + costFields[idx] + ' to ' + parseFloat(newCost).toLocaleString(undefined,{minimumFractionDigits:2}) : '(Enter a number to set ' + costFields[idx] + '.)',
                callback: function(t) {
                  if (newCost != 'NaN') {
                    var newCosts = costs ? costs : Array(costFields.length).fill(false);
                    newCosts[idx] = newCost;
                    return t.set('card','shared','costs', newCosts)
                    .then(function() {
                      return t.set('board','shared','refresh',Math.random())
                      .then(function() {
                        return t.closePopup();
                      });
                    });
                  }
                  return t.closePopup();
                }
              }];
              if (costs && costs[idx]) {
                buttons.push({
                  text: 'Remove ' + costFields[idx] + '.',
                  callback: function(t) {
                    var newCosts = costs ? costs : Array(costFields.length).fill(false);
                    newCosts[idx] = false;
                    t.set('card','shared','costs', newCosts);
                    return t.closePopup();
                  }
                });
              }
              return buttons;
            },
            search: {
              placeholder: 'Enter Cost',
              empty: 'Error',
              searching: 'Processing...'
            }
          });
        } : null
      });
    });
    return buttons;
  });
  });
}

TrelloPowerUp.initialize({
  'board-buttons': function(t, options){
    return getBoardButtons(t);
  },
  'card-badges': function(t, options){
    return getBadges(t);
  },
  'card-buttons': function(t, options) {
    return getButtons(t);
  },
  'show-settings': function(t, options) {
    return getSettings(t);
  }
});