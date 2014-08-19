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

		return s3.deleteObjectSync({
			Bucket: Meteor.settings.AWS.bucket,
			Key: key
		});
	},

	// Method for moving a file into the thrash folder
	'simpleS3/fileMoveToThrash': function ( key ) {
		if (!this.userId)
			throw new Meteor.Error(401, 'Log in please');

		return s3.copyObjectSync({
			Bucket: Meteor.settings.AWS.bucket,
			CopySource: encodeURIComponent(Meteor.settings.AWS.bucket+'/'+key),
			Key: 'thrash/' + new Date() + '-' + key,
			ACL: 'public-read'
		});
	}

});