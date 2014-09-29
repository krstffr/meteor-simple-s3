Package.describe({
  name: "krstffr:simple-s3",
  summary: "UI for viewing, uploading and deleting files from your AWS S3.",
  git: "https://github.com/krstffr/meteor-simple-s3",
  version: "0.0.1"
});

Package.onUse(function (api) {

  api.use('templating', 'client');
  api.use('mrt:aws-sdk@0.2.0', 'server');
  api.use('underscore', ['client', 'server']);

  api.add_files('lib/simple-s3-client.js', ['client']);
  api.add_files('lib/simple-s3-server.js', ['server']);

  // Views
  api.add_files(['lib/views/simple-s3-view-home.html', 'lib/views/simple-s3-view-home.js'], 'client');

  // CSS
  api.add_files(['lib/css/stylesheets/simple-s3-styles.css'], 'client');

  if (typeof api.export !== 'undefined') {

    // The main object.
    api.export('SimpleS3', 'client');

  }

});
