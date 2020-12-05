//frontend env (unconventional, sure, but convenient)
var env={};

//for eventual GH pages config
prefix = "./"

if(window){
  Object.assign(env, window.__env);
}

//set up the app
var app = angular.module('restructuring', ['ngRoute', 'angucomplete-alt',  'ngAnimate', 'ui.bootstrap', 'ngSanitize', 'summernote']);

app.config(function($routeProvider) {
  $routeProvider
   .when("/", {
       templateUrl : prefix + "views/home.html"
   })
   .when("/email", {
       templateUrl :  prefix + "views/form.html"
   })

});

app.controller('ctrl', function($scope,  $window, $document, $location, dbService, $uibModal,  $sce, $templateRequest, $compile) {
  $scope.model = {
    targets:{},
    form: {signup: true, group:6,},
    newTarget:{},
    inProgress: false
  }

  function loadTemplate() {
    var templateUrl = $sce.getTrustedResourceUrl(prefix+ 'views/template.html');
     $templateRequest(templateUrl).then(function(template) {
         // template is the loaded HTML template as a string
         //$scope.model.template = angular.element(template);
         s = document.createElement("html")
         s.innerHTML = template
         $scope.model.template = s
         $scope.model.editable =  $(s).find('#main-text-content');

     }, function() {
         // An error has occurred
         console.log("well shit")
     })
  }

  function init() {
    //ok there's a bit of duplication here but it's not the end of the world
    dbService.getGroups().then(function(d){
      $scope.model.groups = d
    })
    dbService.getTargets(null).then(function(d){
      $scope.model.targets.group = d
      $scope.model.form.targets = d.filter(function(x){
        return x.groups.includes($scope.model.form.group)
      })
    })
    dbService.getTargets('faculty').then(function(d){
      $scope.model.targets.faculty = d
      $scope.model.faculties = [''].concat([...new Set(d.map(x=>x.faculty))])
    })
    loadTemplate()


  }

  window.onload = init;

  //scope functions for form actions

  $scope.addTarget = function(){
    let data = {
      "name": $scope.model.newTarget.name==''? null:$scope.model.newTarget.name=='',
      "role":$scope.model.newTarget.role==''? null:$scope.model.newTarget.role,
      "email": $scope.model.newTarget.email
    }
    dbService.addTarget(data).then(function(d){
      $scope.model.form.targets.push({id: d["id"], email: $scope.model.newTarget.email});
      //reset
      $scope.model.newTarget = {}
      $scope.closeModal()
    })
  }

  $scope.submit = function(){
    $scope.model.inProgress = true
    let signature = document.createElement("span")
    signature.innerHTML = $scope.model.form.fn+'&nbsp;'+$scope.model.form.ln
    $($scope.model.template).find('#content-wrapper').append($scope.model.editable)
    $($scope.model.template).find("#letter-signature").append(signature)

    //for testing purposes
    if($scope.model.form.targets.length==1 && $scope.model.form.targets[0].email=="anna.sollazzo@shaw.ca") {
      console.log("got here")
      let data = {
        "first_name":$scope.model.form.fn && $scope.model.form.fn!=''? Aes.Ctr($scope.model.form.fn, __env.secret, 256):null ,
        "last_name":$scope.model.form.ln && $scope.model.form.ln!=''? Aes.Ctr($scope.model.form.ln, __env.secret, 256):null ,
        "email": Aes.Ctr($scope.model.form.email, __env.secret, 256),
        "group":$scope.model.form.group,
        "signup": $scope.model.form.signup
      }
      console.log(data)
      dbService.addContact(data).then(function(d){
        console.log("contact added")
        let config = {
          "targets":$scope.model.form.targets.map(x=>x.email),
          "subject":$scope.model.form.subject,//this will need to be updated when I know how it works
          "template":$scope.model.template.outerHTML
        }
        dbService.sendEmail(config).then(function(){
          //send the record
          let record = {
            "contact":d["id"],
            "targets":$scope.model.form.targets.map(x=>x.id),
            "reason": $scope.model.form.reason==''? null:$scope.model.form.reason
          }
          dbService.addSentRecord(record).then(function(){
            //we're done, so reset?
            $scope.model.form = {signup: false, group:6}
            loadTemplate()
            $scope.model.inProgress = false
          })
        })
      })
    }

  }

  $scope.updateTargets = function() {
   //hang onto any user defined ones
   let keep = $scope.model.form.targets.filter(function(x){return x.groups==null || (x.faculty!=null && $scope.model.form.group!=6 )})
   let t = $scope.model.targets.group.filter(function(x){return x.groups.includes($scope.model.form.group)})
   $scope.model.form.targets =keep.concat(t)
  }

  $scope.updateFaculty = function() {
    let keep = $scope.model.form.targets.filter(function(x){return x.faculty==null})
    if($scope.model.form.faculty){
      keep = keep.concat($scope.model.targets.faculty.filter(function(x){return x.faculty==$scope.model.form.faculty}))
    }
    $scope.model.form.targets = keep
  }

  //for modals (only need one for the form, but useful if you want one anywhere else)
  $scope.openModal = function(fname) {
    $scope.model.modalInstance = $uibModal.open({
       templateUrl: prefix + 'views/'+ fname + ".html" ,
       scope: $scope,
       size: 'sm'
     });
  }

  $scope.closeModal = function() {
    $scope.model.modalInstance.close();
  }





});

app.service('dbService', function($http, $q) {
  return({
    getTargets: getTargets,
    getGroups: getGroups,
    addContact: addContact,
    addTarget: addTarget,
    sendEmail: sendEmail,
    addSentRecord: addSentRecord
  })

  function getTargets(type) {
    var request = $http({
      method: "post",
      url: __env.apiUrl + "/targets" + (type? "/" + type:""),
      data: {key: __env.apiKey}
    });
    return( request.then( handleSuccess, handleError ) );
  }

  function getGroups() {
    var request = $http({
      method: "get",
      url: __env.apiUrl + "/groups"
    });
    return( request.then( handleSuccess, handleError ) );
  }

  function addContact(data) {
    var request = $http({
      method: "post",
      url: __env.apiUrl + "/contact",
      data: {key: __env.apiKey, data:data}
    });
    return( request.then( handleSuccess, handleError ) );
  }

  function addTarget(data) {
    var request = $http({
      method: "post",
      url: __env.apiUrl + "/target",
      data: {key: __env.apiKey, data:data}
    });
    return( request.then( handleSuccess, handleError ) );
  }

  //how this works may need to change
  function sendEmail(data) {
    var request = $http({
      method: "post",
      url: __env.apiUrl + "/send",
      data: {key: __env.apiKey, data:data}
    });
    return( request.then( handleSuccess, handleError ) );
  }

  function addSentRecord(data) {
    var request = $http({
      method: "post",
      url: __env.apiUrl + "/record",
      data: {key: __env.apiKey, data:data}
    });
    return( request.then( handleSuccess, handleError ) );
  }

  function handleError( response ) {
					if (
						! angular.isObject( response.data ) ||
						! response.data.message
						) {
						return( $q.reject( "An unknown error occurred." ) );
					}
					// Otherwise, use expected error message.
					return( $q.reject( response.data.message ) );
	}

	function handleSuccess( response ) {
				return( response.data );
	}
});
