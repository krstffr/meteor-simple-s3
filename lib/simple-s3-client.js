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

	that.loading = {};

	that.loading.start = function () {
		return Session.set('simple-s3__loading', true);
	};

	that.loading.getStatus = function () {
		return Session.get('simple-s3__loading');
	};

	that.loading.stop = function () {
		return Session.set('simple-s3__loading', false);
	};

	that.errorMessages = {};

	that.errorMessages.currentTimer = false;
	that.errorMessages.displayTime = 5000;

	that.errorMessages.newMessage = function ( message ) {
		that.loading.stop();
		Session.set('simple-s3__error-message', message);
		if (that.errorMessages.currentTimer)
			Meteor.clearTimeout( that.errorMessages.currentTimer );
		that.errorMessages.currentTimer = Meteor.setTimeout(function () {
			that.errorMessages.hide();
		}, that.errorMessages.displayTime );
	};

	that.errorMessages.getCurrent = function () {
		return Session.get('simple-s3__error-message');
	};

	that.errorMessages.hide = function () {
		Session.set('simple-s3__error-message', false);
	};

	that.getDirectory = function ( string ) {
		var directory = '/' + string.substring(0, string.lastIndexOf('/')) + '/';
		return directory.replace('//', '/');
	};

	that.getDirectoryWithoutLeadingSlash = function ( dirString ) {
		// Remove the first slash of the directory
		if (dirString.substring(0,1) === '/') {
			dirString = dirString.substring(1);
		}
		return dirString;
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

		that.loading.stop();

	};

	that.updateBucketList = function () {
		that.loading.start();
		Meteor.call('simpleS3/getBucketItems', function (err, res) {
			if (err) {
				that.errorMessages.newMessage( err.reason );
				throw Error(err);
			}
			Session.set('simple-s3__bucket-items', res);
			that.prepareBucketItems();
		});

	};

	that.fileDelete = function ( key ) {
		that.loading.start();
		Meteor.call('simpleS3/fileDelete', key, function (err, res) {
			if (err) {
				that.errorMessages.newMessage( err.reason );
				throw Error(err);
			}
			that.updateBucketList();
		});
	};

	that.fileUpload = function ( fileInput ) {
		that.loading.start();
		var fileMeta = fileInput.files[0];
		if (!fileMeta) {
			var errorMessage = 'No file selected!';
			that.errorMessages.newMessage(errorMessage);
			throw Error(errorMessage);
		}
		var fileReader = new FileReader();
		var directory = that.getDirectoryWithoutLeadingSlash( that.filter.get('Directory') );
		fileReader.onload = function(file) {
			Meteor.call("simpleS3/fileUpload", file, fileMeta, directory, function (err, res) {
				if (err) {
					that.errorMessages.newMessage( err.reason );
					throw Error(err);
				}
				that.updateBucketList();
				Session.set('simple-s3__show-upload-form', false);
				that.forms.resetAll();
			});
		};
		fileReader.readAsBinaryString( fileMeta );
	};

	that.folderCreate = function ( folderName ) {
		that.loading.start();
		var directory = that.getDirectoryWithoutLeadingSlash( that.filter.get('Directory') );
		Meteor.call("simpleS3/folderCreate", folderName, directory, function (err, res) {
			if (err) {
				that.errorMessages.newMessage( err.reason );
				throw Error(err);
			}
			that.updateBucketList();
			that.forms.resetAll();
		});
	};

	that.forms = {};

	that.forms.resetAll = function () {
		$('.simple-s3 form').trigger("reset");
		Session.set('simple-s3__show-upload-form', false);
		Session.set('simple-s3__show-create-folder-form', false);
	};

};

SimpleS3 = new SimpleS3Class();