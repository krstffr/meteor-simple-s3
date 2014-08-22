if (Meteor.settings.AWS) {

	// These fields are required
	if (!Meteor.settings.AWS.accessKeyId)
		throw new Meteor.Error(400, 'Missing Meteor.settings.AWS.accessKeyId');
	if (!Meteor.settings.AWS.secretAccessKey)
		throw new Meteor.Error(400, 'Missing Meteor.settings.AWS.secretAccessKey');
	if (!Meteor.settings.AWS.bucket)
		throw new Meteor.Error(400, 'Missing Meteor.settings.AWS.bucket');

	// Set up config vars
	AWS.config.update({
		accessKeyId: Meteor.settings.AWS.accessKeyId,
		secretAccessKey: Meteor.settings.AWS.secretAccessKey
	});
	
	s3 = new AWS.S3();

} else {
	throw new Meteor.Error(400, 'Missing Meteor.settings.AWS');
}

Meteor.methods({

	// Move a file
	'simpleS3/fileMove': function ( key, destinationKey, filename ) {
		if (!this.userId)
			throw new Meteor.Error(401, 'Log in please');

		console.log('Moving "' + key + '" to "' + destinationKey + '". Filename is "' + filename + '"');

		var copiedFile = s3.copyObjectSync({
			Bucket: Meteor.settings.AWS.bucket,
			CopySource: encodeURIComponent(Meteor.settings.AWS.bucket+'/'+key),
			Key: destinationKey+filename,
			ACL: 'public-read'
		});

		if (copiedFile) {
			console.log('Copied file!', copiedFile);
			return Meteor.call('simpleS3/fileDelete', key);
		}
		else
			throw new Meteor.Error(401, 'Something went wrong when renaming file.');

	},

	// Create a folder
	'simpleS3/folderCreate': function ( folderName, directory ) {
		if (!this.userId)
			throw new Meteor.Error(401, 'Log in please');

		console.log('Creating folder ' + folderName + ' in ' + directory );

		return s3.putObjectSync({
			Bucket: Meteor.settings.AWS.bucket,
			ACL: 'public-read',
			Key: directory+folderName + '/',
			Body: ''
		});
	},

	// Upload a file!
	'simpleS3/fileUpload': function( file, fileMeta, directory ) {
		if (!this.userId)
			throw new Meteor.Error(401, 'Log in please');

		var key = directory+fileMeta.name;

		var objectToUpload = {
			Bucket: Meteor.settings.AWS.bucket,
			ACL: 'public-read',
			Key: key,
			ContentType: fileMeta.type,
			Body: new Buffer( file.target.result, 'binary')
		};

		// Add a cache header to images!
		var cacheFileTypes = [
			'image/gif',
			'image/jpeg',
			'image/png'
		];

		if ( cacheFileTypes.indexOf( fileMeta.type ) > -1) {
			var cacheString = 'public,max-age=2592000';
			objectToUpload.CacheControl = cacheString;
			console.log('Setting CacheControl to: ' + cacheString);
		}

		console.log('Uploading ' + key );

		return s3.putObjectSync( objectToUpload );
	},

	// Rename a file!
	// (Which is really copying it and deleting the original file)
	'simpleS3/fileRename': function ( key, newKey ) {
		if (!this.userId)
			throw new Meteor.Error(401, 'Log in please');

		console.log('Renaming ' + key + ' to ' + newKey);

		var copiedFile = s3.copyObjectSync({
			Bucket: Meteor.settings.AWS.bucket,
			CopySource: encodeURIComponent(Meteor.settings.AWS.bucket+'/'+key),
			Key: newKey,
			ACL: 'public-read'
		});

		if (copiedFile) {
			console.log('Copied file!', copiedFile);
			return Meteor.call('simpleS3/fileDelete', key);
		}
		else
			throw new Meteor.Error(401, 'Something went wrong when renaming file.');

	},

	// Just get the list
	'simpleS3/getBucketItems': function () {
		if (!this.userId)
			throw new Meteor.Error(401, 'Log in please');

		return s3.listObjectsSync({
			Bucket: Meteor.settings.AWS.bucket
		});
	},

	// Method for deleting a file
	// (This also calls the copy-to-thrash-method)
	'simpleS3/fileDelete': function ( key ) {
		if (!this.userId)
			throw new Meteor.Error(401, 'Log in please');

		if (typeof key !== 'string')
			throw new Meteor.Error(400, '"key" must be a string!');

		if (!Meteor.call('simpleS3/fileMoveToThrash', key))
			throw new Meteor.Error(400, 'Could now move '+key+' to thrash!');

		console.log('Deleting ' + key );

		return s3.deleteObjectSync({
			Bucket: Meteor.settings.AWS.bucket,
			Key: key
		});

	},

	// Method for moving a file into the thrash folder
	'simpleS3/fileMoveToThrash': function ( key ) {
		if (!this.userId)
			throw new Meteor.Error(401, 'Log in please');

		console.log('Trashing: "' + key + '" (moving to trash).');

		return s3.copyObjectSync({
			Bucket: Meteor.settings.AWS.bucket,
			CopySource: encodeURIComponent(Meteor.settings.AWS.bucket+'/'+key),
			Key: 'thrash/' + new Date() + '-' + key,
			ACL: 'public-read'
		});
	}

});