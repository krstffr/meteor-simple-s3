Package.describe({
  name: "krstffr:simple-s3",
  summary: "UI for viewing, uploading and deleting files from your AWS S3.",
  git: "https://github.com/krstffr/meteor-simple-s3",
  version: "0.1.4"
});

Npm.depends({
  'aws-sdk': '2.0.23'
});

Package.onUse(function (api) {

  api.versionsFrom("METEOR@0.9.0");

  api.use(['templating',
    'reactive-var@1.0.4',
    'edgee:slingshot@0.4.1',
    'pfafman:font-awesome-4@4.2.0']);

  // Files on both server/client
  api.add_files([
    'lib/slingshot-setup.js'
    ], ['server', 'client']);

  // Server files
  api.add_files([
    'lib/aws-blocking-methods.js',
    'lib/simple-s3-server.js'],
    'server');

  // Client files
  api.add_files([
    'lib/simple-s3-client.js',
    'lib/views/simple-s3-view-home.html',
    'lib/views/simple-s3-view-home.js',
    'lib/css/stylesheets/simple-s3-styles.css'],
    'client');

  // The main object.
  api.export('SimpleS3', 'client');

});
