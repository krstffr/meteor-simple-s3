SimpleS3Class = function () {
	
	var that = this;

	that.prepareBucketItems = function () {
		if (!Session.get('simple-s3__bucket-items'))
			return ;
		var bucketObject = Session.get('simple-s3__bucket-items');
		bucketObject.Contents = _.sortBy(bucketObject.Contents, function(bucketItem) {
			return bucketItem.Size;
		});
		Session.set('simple-s3__bucket-items', bucketObject);
	};

	that.updateBucketList = function () {
		Meteor.call('simpleS3/getBucketItems', function (err, res) {
			if (err)
				throw Error(err);
			Session.set('simple-s3__bucket-items', res);
			that.prepareBucketItems();
		});

	};

	that.fileDelete = function ( key ) {
		Meteor.call('simpleS3/fileDelete', key, function (err, res) {
			if (err)
				throw Error(err);
			that.updateBucketList();
		});

	};

};

SimpleS3 = new SimpleS3Class();