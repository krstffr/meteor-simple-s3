if (!Meteor.settings.public)
	Meteor.settings.public = {};

if (process.env.AWS_ACCESS_KEY_ID)
	Meteor.settings.AWSAccessKeyId = process.env.AWS_ACCESS_KEY_ID;

if (process.env.AWS_SECRET_ACCESS_KEY)
	Meteor.settings.AWSSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (process.env.AWS_BUCKET)
	Meteor.settings.public.AWSbucket = process.env.AWS_BUCKET;

if (process.env.AWS_REGION)
	Meteor.settings.public.AWSregion = process.env.AWS_REGION;

// These fields are required
if (!Meteor.settings)
	console.error('Missing Meteor.settings, can\'t setup Simple-S3');

if (!Meteor.settings.AWSAccessKeyId)
	console.error('Missing Meteor.settings.AWSAccessKeyId, can\'t setup Simple-S3');

if (!Meteor.settings.AWSSecretAccessKey)
	console.error('Missing Meteor.settings.AWSSecretAccessKey, can\'t setup Simple-S3');

if (!Meteor.settings.public.AWSbucket)
	console.error('Missing Meteor.settings.public.AWSbucket, can\'t setup Simple-S3');

if (!Meteor.settings.public.AWSregion)
	console.error('Missing Meteor.settings.public.AWSregion, can\'t setup Simple-S3');

if (Meteor.settings.AWSAccessKeyId &&
	Meteor.settings.AWSSecretAccessKey &&
	Meteor.settings.public.AWSbucket &&
	Meteor.settings.public.AWSregion) {

	AWS.config.update({
		accessKeyId: Meteor.settings.AWSAccessKeyId,
		secretAccessKey: Meteor.settings.AWSSecretAccessKey,
		region: Meteor.settings.public.AWSregion
	});

	s3 = new AWS.S3();

	// Setup Slingshort
	Slingshot.createDirective("simple-s3-uploads", Slingshot.S3Storage, {
		bucket: Meteor.settings.public.AWSbucket,
		region: Meteor.settings.public.AWSregion,
		acl: "public-read",
		cacheControl: 'public,max-age=2592000',
		authorize: function () {
			if (!this.userId) {
				var message = "Please login before posting files";
				throw new Meteor.Error("Login Required", message);
			}
			return true;
		},
		key: function ( file, meta ) {
			return meta.key;
		}
	});

}


Meteor.methods({

	// Make sure we have everything we need
	'simpleS3/checkSettings': function () {
		return Meteor.settings.AWSAccessKeyId &&
		Meteor.settings.AWSSecretAccessKey &&
		Meteor.settings.public.AWSbucket;
	},

	// Move a file
	'simpleS3/fileMove': function ( key, destinationKey, filename ) {
		if (!this.userId)
			throw new Meteor.Error(401, 'Log in please');

		if (!Meteor.call('simpleS3/checkSettings'))
			throw new Meteor.Error(400, 'Missing settings in Meteor.settings.AWS');

		console.log('Moving "' + key + '" to "' + destinationKey + '". Filename is "' + filename + '"');

		var copiedFile = s3.copyObjectSync({
			Bucket: Meteor.settings.public.AWSbucket,
			CopySource: encodeURIComponent(Meteor.settings.public.AWSbucket+'/'+key),
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

		if (!Meteor.call('simpleS3/checkSettings'))
			throw new Meteor.Error(400, 'Missing settings in Meteor.settings.AWS');

		console.log('Creating folder ' + folderName + ' in ' + directory );

		return s3.putObjectSync({
			Bucket: Meteor.settings.public.AWSbucket,
			ACL: 'public-read',
			Key: directory+folderName + '/',
			Body: ''
		});
	},

	// Upload a file!
	'simpleS3/fileUpload': function( file, fileMeta, directory ) {
		throw new Meteor.Error(401, 'This method is deprecated, now using Slingshot!');
	},

	// Rename a file!
	// (Which is really copying it and deleting the original file)
	'simpleS3/fileRename': function ( key, newKey ) {
		if (!this.userId)
			throw new Meteor.Error(401, 'Log in please');

		if (!Meteor.call('simpleS3/checkSettings'))
			throw new Meteor.Error(400, 'Missing settings in Meteor.settings.AWS');

		console.log('Renaming ' + key + ' to ' + newKey);

		var copiedFile = s3.copyObjectSync({
			Bucket: Meteor.settings.public.AWSbucket,
			CopySource: encodeURIComponent(Meteor.settings.public.AWSbucket+'/'+key),
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

		if (!Meteor.call('simpleS3/checkSettings'))
			throw new Meteor.Error(400, 'Missing settings in Meteor.settings.AWS');

		return s3.listObjectsSync({
			Bucket: Meteor.settings.public.AWSbucket
		});
	},

	// Method for deleting a file
	// (This also calls the copy-to-thrash-method)
	'simpleS3/fileDelete': function ( key ) {
		if (!this.userId)
			throw new Meteor.Error(401, 'Log in please');

		if (!Meteor.call('simpleS3/checkSettings'))
			throw new Meteor.Error(400, 'Missing settings in Meteor.settings.AWS');

		if (typeof key !== 'string')
			throw new Meteor.Error(400, '"key" must be a string!');

		if (!Meteor.call('simpleS3/fileMoveToThrash', key))
			throw new Meteor.Error(400, 'Could now move '+key+' to thrash!');

		console.log('Deleting ' + key );

		return s3.deleteObjectSync({
			Bucket: Meteor.settings.public.AWSbucket,
			Key: key
		});

	},

	// Method for moving a file into the thrash folder
	'simpleS3/fileMoveToThrash': function ( key ) {
		if (!this.userId)
			throw new Meteor.Error(401, 'Log in please');

		if (!Meteor.call('simpleS3/checkSettings'))
			throw new Meteor.Error(400, 'Missing settings in Meteor.settings.AWS');

		console.log('Trashing: "' + key + '" (moving to trash).');

		return s3.copyObjectSync({
			Bucket: Meteor.settings.public.AWSbucket,
			CopySource: encodeURIComponent(Meteor.settings.public.AWSbucket+'/'+key),
			Key: 'thrash/' + new Date() + '-' + key,
			ACL: 'public-read'
		});
	}

});