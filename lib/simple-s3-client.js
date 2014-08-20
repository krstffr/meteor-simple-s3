SimpleS3Class = function () {
	
	var that = this;

	that.bucketObject = false;
	that.currentSortOrder = { sortBy: 'FileExtension', ascOrDesc: 'asc' };

	that.getDirectory = function ( string ) {
		return string.substring(0, string.lastIndexOf('/')) + '/';
	};

	that.getFileName = function ( string ) {
		return string.split("/").pop();
	};

	that.getFileExtension = function ( string ) {
		var regexPatt = /\.([0-9a-z]+)(?:[\?#]|$)/i;
		var match = (string).match(regexPatt);
		if (match)
			return '.'+match[1];
		return '.';
	};

	that.saveBucketList = function () {
		Session.set('simple-s3__bucket-items', that.bucketObject);
	};

	that.addExtraFields = function () {

		that.bucketObject = Session.get('simple-s3__bucket-items');

		that.bucketObject.Contents = _(that.bucketObject.Contents).map( function( bucketItem ) {
			bucketItem.Filename = that.getFileName( bucketItem.Key );
			bucketItem.Directory = that.getDirectory( bucketItem.Key );
			bucketItem.FileExtension = that.getFileExtension( bucketItem.Key );
			return bucketItem;
		});

		that.saveBucketList();
		
	};

	that.getCurrentSortOrder = function () {
		return Session.get('simple-s3__bucket-items-list');
	};

	that.setSortOrderOfBucketList = function ( sortingKey, ascOrDesc ) {

		that.bucketObject = Session.get('simple-s3__bucket-items');

		if (!ascOrDesc && that.currentSortOrder.sortBy === sortingKey) {
			if (that.currentSortOrder.ascOrDesc === 'desc')
				that.currentSortOrder.ascOrDesc = 'asc';
			else
				that.currentSortOrder.ascOrDesc = 'desc';
		}

		that.currentSortOrder.sortBy = sortingKey || that.currentSortOrder.sortBy;
		that.currentSortOrder.ascOrDesc = ascOrDesc || that.currentSortOrder.ascOrDesc;

		Session.set('simple-s3__bucket-items-list', that.currentSortOrder);

		that.bucketObject.Contents = _(that.bucketObject.Contents)
		.chain()
		.sortBy(that.currentSortOrder.sortBy)
		.value();

		if (that.currentSortOrder.ascOrDesc === 'desc')
			that.bucketObject.Contents.reverse();

		that.saveBucketList();

	};

	that.prepareBucketItems = function () {
		if (!Session.get('simple-s3__bucket-items'))
			return ;

		// Add needed fields
		that.addExtraFields();
		
		// Set the order
		that.setSortOrderOfBucketList( 'FileExtension', 'asc' );

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