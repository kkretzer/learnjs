'use strict';

function googleSignIn(googleUser) {
  var id_token = googleUser.getAuthResponse().id_token;
  AWS.config.update({
    region: 'us-east-1',
    credentials: new AWS.CognitoIdentityCredentials({
      IdentityPoolId: learnjs.poolId,
      Logins: {
        'accounts.google.com': id_token
      }
    })
  });

  function refresh() {
    return gapi.auth2.getAuthInstance().signIn({
        prompt: 'login'
      }).then(function(userUpdate) {
      var creds = AWS.config.credentials;
      var newToken = userUpdate.getAuthResponse().id_token;
      creds.params.Logins['accounts.google.com'] = newToken;
      return learnjs.awsRefresh();
    });
  }

  learnjs.awsRefresh().then(function(id) {
    learnjs.identity.resolve({
      id: id,
      email: googleUser.getBasicProfile().getEmail(),
      refresh: refresh
    });
  });
}

var learnjs = {
  'poolId': 'us-east-1:d4d0aaa0-6a8e-43b3-adfd-9365b5314405'
};

learnjs.identity = new $.Deferred();

learnjs.awsRefresh = function() {
  var deferred = new $.Deferred();
  AWS.config.credentials.refresh(function(err) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(AWS.config.credentials.identityId);
    }
  });
  return deferred.promise();
}

learnjs.problems = [
  {
    description: "What is truth?",
    code: "function problem() { return __; }"
  },
  {
    description: "Simple Math",
    code: "function problem() { return 42 === 6 * __; }"
  }
  ,{
    description: "Array Indexing",
    code: "function problem() {\n" +
    "  var a = ['foo', 'bar'];\n" +
    "  return a[__] === 'bar';\n}"
  }
  ,{
    description: "How many?",
    code: "function problem() {\n" +
    "  var a = ['foo', 'bar'];\n" +
    "  return a.__ === 2;\n}"
  }
  ,{
    description: "Make it bigger",
    code: "function problem() {\n" +
    "  var a = ['foo', 'bar'];\n" +
    "  a.__;\n" +
    "  return a[2] === 'a third item';\n}"
  }
  ,{
    description: "Functions",
    code: "function problem() {\n" +
    "  var f = __;\n" +
    "  return f();\n}"
  }
];

learnjs.showView = function(hash) {
  var routes = {
    '#problem': learnjs.problemView,
    '#profile': learnjs.profileView,
    '#popularAnswers': learnjs.popularAnswersView,
    '#': learnjs.landingView,
    '': learnjs.landingView
  };
  var hashParts = hash.split('-');
  var viewFn = routes[hashParts[0]];
  if (viewFn) {
    learnjs.triggerEvent('removingView', []);
    var view = viewFn(hashParts[1]);
    $('.view-container').empty().append(view);
  }
};

learnjs.landingView = function() {
  return learnjs.template('landing-view');
}

learnjs.template = function(name) {
  return $('.templates .' + name).clone();
};

learnjs.problemView = function(data) {
  var problemNumber = parseInt(data, 10);
  var view = learnjs.template('problem-view');
  var problemData = learnjs.problems[problemNumber - 1];
  var resultFlash = view.find('.result');
  var answer = view.find('.answer');

  learnjs.fetchAnswer(problemNumber).then(function(data) {
    if (data.Item) {
      answer.val(data.Item.answer);
    }
  });
  
  function checkAnswer() {
    var test = problemData.code.replace('__', answer.val()) + '; problem();';
    return eval(test);
  }

  function checkAnswerClick() {
    if (checkAnswer()) {
      var correctFlash = learnjs.buildCorrectFlash(problemNumber);
      learnjs.flashElement(resultFlash, correctFlash);
      learnjs.saveAnswer(problemNumber, answer.val());
    } else {
      learnjs.flashElement(resultFlash, 'Incorrect!');
    }
    return false;
  }

  view.find('.check-btn').click(checkAnswerClick);
  view.find('.title').text('Problem #' + problemNumber);
  learnjs.applyObject(problemData, view);

  if (problemNumber < learnjs.problems.length) {
    var buttonItem = learnjs.template('skip-btn');
    buttonItem.find('a').attr('href', '#problem-' + (problemNumber + 1));
    $('.nav-list').append(buttonItem);
    view.bind('removingView', function() {
      buttonItem.remove();
    });
  }

  var popularButton = learnjs.template('popular-btn');
  popularButton.find('a').attr('href', '#popularAnswers-' + problemNumber);
  $('.nav-list').append(popularButton);
  view.bind('removingView', function() {
    popularButton.remove();
  });

  return view;
};

learnjs.buildCorrectFlash = function (problemNum) {
  var correctFlash = learnjs.template('correct-flash');
  var link = correctFlash.find('a');
  if (problemNum < learnjs.problems.length) {
    link.attr('href', '#problem-' + (problemNum + 1));
  } else {
    link.attr('href', '');
    link.text("You're Finished!");
  }
  return correctFlash;
};

learnjs.profileView = function () {
  var view = learnjs.template('profile-view');
  learnjs.identity.done(function (identity) {
    view.find('.email').text(identity.email);
  });
  return view;
};

learnjs.addProfileLink = function(profile) {
  var link = learnjs.template('profile-link');
  link.find('a').text(profile.email);
  $('.signin-bar').prepend(link);
};

learnjs.appOnReady = function() {
  window.onhashchange = function() {
    learnjs.showView(window.location.hash);
  };
  learnjs.showView(window.location.hash);
  learnjs.identity.done(learnjs.addProfileLink);
};

learnjs.popularAnswersView = function(data) {
  var problemNumber = parseInt(data, 10);
  var view = learnjs.template('popular-answers-view');
  var problemData = learnjs.problems[problemNumber - 1];
  view.find('.title').text('Problem #' + problemNumber);
  learnjs.applyObject(problemData, view);


  var buttonItem = learnjs.template('try-problem-btn');
  buttonItem.find('a').attr('href', '#problem-' + (problemNumber));
  $('.nav-list').append(buttonItem);
  view.bind('removingView', function() {
    buttonItem.remove();
  });

  learnjs.popularAnswers(problemNumber).then(function(data) {
    var answers = JSON.parse(data.Payload);
    var answerTexts = Object.keys(answers).sort(function(a,b) {
      return (answers[a] < answers[b]) ? -1 : ((answers[a] > answers[b]) ? 1 : 0);
    }).reverse();
    
    var ul = view.find('ul');
    answerTexts.forEach(function(answer) {
      var answerItem = learnjs.template('popular-answer');
      answerItem.find('.answer-count').text(answers[answer] + " times:");
      answerItem.find('.answer-text').text(answer);
      ul.append(answerItem);
    });
  });

  return view;
};

learnjs.popularAnswers = function(problemId) {
  return learnjs.identity.then(function() {
    var lambda = new AWS.Lambda();
    var params = {
      FunctionName: 'popularAnswers',
      Payload: JSON.stringify({problemNumber: problemId})
    };
    return learnjs.sendAwsRequest(lambda.invoke(params), function() {
      return learnjs.popularAnswers(problemId);
    });
  });
};

learnjs.applyObject = function(obj, elem) {
  for (var key in obj) {
    elem.find('[data-name="' + key + '"]').text(obj[key]);
  }
};

learnjs.flashElement = function(elem, content) {
  elem.fadeOut('fast', function() {
    elem.html(content);
    elem.fadeIn();
  });
};

learnjs.triggerEvent = function(name, args) {
  $('.view-container>*').trigger(name, args);
};

learnjs.sendAwsRequest = function(req, retry) {
  var promise = new $.Deferred();
  req.on('error', function(error) {
    if (error.code === 'CredentialsError') {
      learnjs.identity.then(function(identity) {
        return identity.refresh().then(function() {
          return retry();
        }, function(resp) {
          promise.reject(resp);
        })
      });
    } else {
      promise.reject(error);
    }
  });
  req.on('success', function(resp) {
    promise.resolve(resp.data);
  });
  req.send();
  return promise;
};

learnjs.saveAnswer = function(problemId, answer) {
  return learnjs.identity.then(function(identity) {
    var db = new AWS.DynamoDB.DocumentClient();
    var item = {
      TableName: 'learnjs',
      Item: {
        userId: identity.id,
        problemId: problemId,
        answer: answer
      }
    };
    return learnjs.sendAwsRequest(db.put(item), function() {
      return learnjs.saveAnswer(problemId, answer);
    });
  });
};

learnjs.fetchAnswer = function(problemId) {
  return learnjs.identity.then(function(identity) {
    var db = new AWS.DynamoDB.DocumentClient();
    var item = {
      TableName: 'learnjs',
      Key: {
        userId: identity.id,
        problemId: problemId
      }
    };
    return learnjs.sendAwsRequest(db.get(item), function() {
      return learnjs.fetchAnswer(problemId);
    });
  });
};

learnjs.countAnswers = function(problemId) {
  return learnjs.identity.then(function(identity) {
    var db = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: 'learnjs',
      Select: 'COUNT',
      FilterExpression: 'problemId = :problemId',
      ExpressionAttributeValues: {':problemId': problemId}
    };
    return learnjs.sendAwsRequest(db.scan(params), function() {
      return learnjs.countAnswers(problemId);
    });
  });
};
