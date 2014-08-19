Package.describe({
  "summary": "UI for viewing, uploading and deleting files from your AWS S3."
});

Package.on_use(function (api) {

	api.use('templating', 'client');
  api.use('aws-sdk', 'server');
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
