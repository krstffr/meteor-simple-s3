SimpleS3Class = function () {
	
	var that = this;

	that.bucketObject = false;
	that.currentSortOrder = { sortBy: 'FileExtension', ascOrDesc: 'asc' };

	that.filter = {};

	that.filter.set = function ( key, value ) {
		var currentFilters = that.filter.get();
		currentFilters[key] = value;
		return Session.set('filter', currentFilters );
	};

	that.filter.get = function ( key ) {
		if (!key)
			return Session.get('filter');
		return Session.get('filter')[ key ];
	};

	that.filter.reset = function ( key ) {
		var currentFilters = that.filter.get();
		delete currentFilters[key];
		return Session.set('filter', currentFilters );
	};

	that.filter.filterCurrentBucket = function ( bucket ) {
		return _.filter( that.getBucketList().Contents, function( bucketItem ){
			// If there are filters, use those
			var filterDontReturn = false;
			var filters = that.filter.get();
			if (filters) {
				_.each(filters, function(value, key){
					// If a filter has already excluded a bucket item, don't keep going
					if (!filterDontReturn) {
						if (key === 'Directory') {
							// This is for Directories only
							if (bucketItem[key] === value && bucketItem.Filename) {
								// If the bucket item has a Filename and the directory
								// is the same as the one we're filtering, just keep going.
							} else {
								// If the directory is not equal to the filter, keep going here!
								if ( bucketItem.Filename ) {
									// If there is a Filename then we're not in the current folder, and this is not
									// a directory. Meaning: it should not be visible!
									filterDontReturn = true;
								} else {
									// directoriesAsArray is an array of all the directories in the Directory key.
									// If there bucketItem.Directorys is '/' then just return an array with that.
									var directoriesAsArray = bucketItem[key].match(/([^/.]+)/g) || ['/'];
									// The "highest" folder, meaning: /folder/folder/highest/
									var highestFolder = directoriesAsArray[ directoriesAsArray.length -1 ];
									// The parent folder is everything in the Directory value minus the highest folder
									var parentFolder = bucketItem[key].replace(highestFolder+'/', '');
									// If the parent folder is not equal to the current folder, don't show it!
									filterDontReturn = parentFolder !== value;
								}
							}
						} else {
							// This is for all other filters
							filterDontReturn = bucketItem[key] !== value;
						}
					}
				});
			}
			// Don't return the ones which are in the thrash!
			return !(/thrash/i).test( bucketItem.Key ) && !filterDontReturn;
		});
	};

	that.getDirectory = function ( string ) {
		var directory = '/' + string.substring(0, string.lastIndexOf('/')) + '/';
		return directory.replace('//', '/');
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

	that.getBucketList = function () {
		return Session.get('simple-s3__bucket-items');
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
		that.setSortOrderOfBucketList( that.getCurrentSortOrder() );

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

	that.fileUpload = function ( fileInput ) {
		var fileMeta = fileInput.files[0];
		var fileReader = new FileReader();
		fileReader.onload = function(file) {
			Meteor.call("simpleS3/fileUpload", file, fileMeta, function (err, res) {
				if (err)
					throw Error(err);
				that.updateBucketList();
			});
		};
		fileReader.readAsBinaryString( fileMeta );
	};

	that.folderCreate = function ( folderName ) {
		if (typeof folderName !== 'string')
			throw new Error('Hey, this is no string!');

		Meteor.call("simpleS3/folderCreate", folderName, function (err, res) {
			if (err)
				throw Error(err);
			that.updateBucketList();
		});
	};

};

SimpleS3 = new SimpleS3Class();