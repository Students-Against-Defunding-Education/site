//frontend env (unconventional, sure, but convenient)
var env={};

//for eventual GH pages config
prefix = "./"

if(window){
  Object.assign(env, window.__env);
}




//set up the app
var app = angular.module('restructuring', ['ngRoute', 'angucomplete-alt',  'ngAnimate']);

app.config(function($routeProvider) {
  $routeProvider
   .when("/", {
       templateUrl : prefix + "views/home.html"
   })
   .when("/email", {
       templateUrl :  prefix + "views/form.html"
   })

});

app.controller('ctrl', function($scope,  $window, $document, $location) {
  $scope.model = {}
});
