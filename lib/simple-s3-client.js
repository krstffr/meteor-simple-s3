SimpleS3Class = function () {
	
	var that = this;

	that.updateBucketList = function () {
		
		// console.log('called updateBucketList()');

		Meteor.call('simpleS3/getBucketItems', function (err, res) {
			if (err)
				throw Error(err);
			Session.set('simple-s3__bucket-items', res);
		});

	};

	that.fileDelete = function ( key ) {
		
		// console.log('called fileDelete()');

		Meteor.call('simpleS3/fileDelete', key, function (err, res) {
			if (err)
				throw Error(err);
			that.updateBucketList();
		});

	};

};

SimpleS3 = new SimpleS3Class();