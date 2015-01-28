SimpleS3Class = function () {
	
	var that = this;

	that.uploader = new ReactiveVar(false);
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

		return _.filter( that.bucketList.get().Contents, function( bucketItem ){
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
									var directoriesAsArray = that.folder.getFoldersStringAsArray( bucketItem[key] );
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

	that.loading.showMessage = function ( loadingMessage ) {
		loadingMessage = loadingMessage || 'Loading…';
		return Session.set('simple-s3__loading', loadingMessage );
	};

	that.loading.getMessage = function () {
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

	that.stringManip = {};

	that.stringManip.getDirectory = function ( string ) {
		var directory = '/' + string.substring(0, string.lastIndexOf('/')) + '/';
		return directory.replace('//', '/');
	};

	that.stringManip.getDirectoryWithoutLeadingSlash = function ( dirString ) {
		// Remove the first slash of the directory
		if (dirString.substring(0,1) === '/') {
			dirString = dirString.substring(1);
		}
		return dirString;
	};

	that.stringManip.getFileName = function ( string ) {
		return string.split("/").pop();
	};

	that.stringManip.getFileExtension = function ( string ) {
		var regexPatt = /\.([0-9a-z]+)(?:[\?#]|$)/i;
		var match = (string).match(regexPatt);
		if (match)
			return '.'+match[1];
		return '.';
	};

	that.bucketList = {};

	that.bucketList.save = function () {
		Session.set('simple-s3__bucket-items', that.bucketObject);
	};

	that.bucketList.get = function () {
		return Session.get('simple-s3__bucket-items');
	};

	that.bucketList.addExtraFields = function () {

		that.bucketObject = Session.get('simple-s3__bucket-items');

		that.bucketObject.Contents = _(that.bucketObject.Contents).map( function( bucketItem ) {
			bucketItem.Filename = that.stringManip.getFileName( bucketItem.Key );
			bucketItem.Directory = that.stringManip.getDirectory( bucketItem.Key );
			bucketItem.FileExtension = that.stringManip.getFileExtension( bucketItem.Key );
			bucketItem.SpecialSort = 10;
			return bucketItem;
		});

		that.bucketList.save();
		
	};

	that.bucketList.getCurrentSortOrder = function () {
		return Session.get('simple-s3__bucket-items-list');
	};

	that.bucketList.setSortOrder = function ( sortingKey, ascOrDesc ) {

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
		.sortBy(that.currentSortOrder.sortBy);

		if (that.currentSortOrder.ascOrDesc === 'desc')
			that.bucketObject.Contents.reverse();

		that.bucketObject.Contents = _(that.bucketObject.Contents)
		.sortBy('SpecialSort');

		that.bucketList.save();

	};

	that.bucketList.addParentFolderLinks = function () {
		var folders = _.filter(that.bucketList.get().Contents, function( bucketItem ){
			return bucketItem.FileExtension === '.';
		});
		var newFolders = _(folders).map( function( folder ) {
			var newFolder = folder;
			delete newFolder.ETag;
			delete newFolder.LastModified;
			delete newFolder.Owner;
			delete newFolder.StorageClass;
			var parentFolder = that.folder.getFoldersStringAsArray( newFolder.Key );
			parentFolder.pop();
			parentFolder.shift();
			parentFolder = parentFolder.join('/') + '/';
			newFolder.Key = parentFolder;
			if (newFolder.Key === '/')
				newFolder.Key = '';
			newFolder.Directory += 'UP/';
			newFolder.SpecialMessage = 'Go up one folder';
			newFolder.SimpleS3ItemOnly = true;
			newFolder.SpecialSort = 1;
			return newFolder;
		});
		
		that.bucketObject.Contents = that.bucketObject.Contents.concat( newFolders );

		that.bucketList.save();

	};

	that.bucketList.prepareItems = function () {
		if (!Session.get('simple-s3__bucket-items'))
			return ;

		// Add needed fields
		that.bucketList.addExtraFields();

		// Add a UP-link folder to each directory
		that.bucketList.addParentFolderLinks();
		
		// Set the order
		that.bucketList.setSortOrder(
			that.bucketList.getCurrentSortOrder().sortBy,
			that.bucketList.getCurrentSortOrder().ascOrDesc
			);

		that.loading.stop();

	};

	that.bucketList.updateFromAWS = function () {
		that.init();
		that.loading.showMessage('Updating filelist…');
		Meteor.call('simpleS3/getBucketItems', function (err, res) {
			if (err) {
				that.errorMessages.newMessage( err.reason );
				if (err.error === 401)
					window.location = '/';
				throw Error(err);
			}
			Session.set('simple-s3__bucket-items', res);
			that.bucketList.prepareItems();
			that.ui.enable();
		});
	};

	that.auth = {};

	that.auth.checkLogin = function () {
		if (!Meteor.userId())
			window.location = '/';
	};

	// Move all file methods into this one!
	that.file = {};

	that.file.delete = function ( key ) {
		that.loading.showMessage('Deleting '+( that.stringManip.getFileName( key ) || key )+'…');
		that.ui.disable();
		Meteor.call('simpleS3/fileDelete', key, function (err, res) {
			if (err) {
				that.errorMessages.newMessage( err.reason );
				throw Error(err);
			}
			that.bucketList.updateFromAWS();
		});
	};

	that.file.deleteMany = function ( items, index ) {
		that.ui.disable();
		that.loading.showMessage('Deleting '+( that.stringManip.getFileName( items[index] ) || items[index] )+'…');
		Meteor.call('simpleS3/fileDelete', items[index], function (err, res) {
			if (err) {
				that.errorMessages.newMessage( err.reason );
				that.bucketList.updateFromAWS();
				throw Error(err);
			}
			if (items.length > index+1) {
				that.file.deleteMany( items, index+1 );
			} else {
				that.bucketList.updateFromAWS();
			}
		});
	};

	that.file.checkIfFileExists = function ( key ) {
		var filesInBucket = that.bucketList.get().Contents;
		if( !_(filesInBucket).findWhere({ Key: key }) )
			return false;
		return true;
	};

	that.file.upload = function ( files, index ) {
		var errorMessage;
		var fileToUpload = files[ index ];
		var directory = that.stringManip.getDirectoryWithoutLeadingSlash( that.filter.get('Directory') );
		var fileMeta = {
			key: (directory || '')+fileToUpload.name
		};

		if (!fileToUpload) {
			errorMessage = 'No file selected!';
			that.errorMessages.newMessage(errorMessage);
			throw Error(errorMessage);
		}

		// Make sure file don't already exist.
		if (that.file.checkIfFileExists( fileMeta.key )) {
			errorMessage = 'File already exists! ' + fileMeta.key;
			that.errorMessages.newMessage(errorMessage);
			throw Error(errorMessage);
		}

		// Show a message about uploading this file.
		that.loading.showMessage('Uploading '+fileToUpload.name+'…');

		that.ui.disable();

		that.uploader.set( new Slingshot.Upload("simple-s3-uploads", fileMeta) );

		that.uploader.get().send(fileToUpload, function (err, downloadUrl) {
			// Was there an error?
			if (err) {
				that.errorMessages.newMessage( err.reason );
				that.bucketList.updateFromAWS();
				that.uploader.set( false );
				throw Error(err);
			}
			// Are there more files? Call this method again on next file!
			if (files.length > index+1) {
				that.file.upload( files, index+1 );
			}
			// There are no more files, upload is done!
			else {
				that.bucketList.updateFromAWS();
				Session.set('simple-s3__show-upload-form', false);
				that.uploader.set( false );
				that.forms.resetAll();
			}
		});

	};

	that.file.handleUpload = function ( fileInput ) {
		that.file.upload( fileInput.files, 0 );
	};

	that.file.rename = function ( key, currentFileName, newFileName ) {
		if ( !that.stringManip.getFileName(key) ) {
			var error = 'Sorry, you cant rename folders right now…';
			that.errorMessages.newMessage( error );
			throw Error(error);
		}
		that.loading.showMessage('Renaming '+currentFileName+' to '+newFileName+'…');
		that.ui.disable();
		var newKey = key.replace(currentFileName, newFileName);
		if (key === newKey) {
			var errorMessage = 'Select a new file name!';
			that.errorMessages.newMessage(errorMessage);
			throw Error(errorMessage);
		}
		Meteor.call('simpleS3/fileRename', key, newKey, function (err, res) {
			if (err) {
				that.errorMessages.newMessage( err.reason );
				throw Error(err);
			}
			that.bucketList.updateFromAWS();
		});
		return ;
	};

	that.file.move = function ( key, destinationKey ) {
		that.loading.showMessage('Moving '+key+' to '+destinationKey);
		var filename = that.stringManip.getFileName( key );
		that.ui.disable();
		Meteor.call('simpleS3/fileMove', key, destinationKey, filename, function (err, res) {
			if (err) {
				that.errorMessages.newMessage( err.reason );
				throw Error(err);
			}
			SimpleS3.file.moveReset();
			that.bucketList.updateFromAWS();
		});
	};

	that.file.moveSelectFile = function ( key ) {
		Session.set('simple-s3__files-movable__current-moving-file', key);
		that.loading.showMessage('Where do you want to move ' + that.stringManip.getFileName( key ) + '?');
	};

	that.file.moveToggle = function () {

		that.loading.stop();
		Session.set('simple-s3__files-movable__current-moving-file', false);
		Session.set('simple-s3__files-movable', !Session.get('simple-s3__files-movable') );
		if (Session.get('simple-s3__files-movable'))
			that.loading.showMessage('Select which file to move');

	};

	that.file.moveReset = function () {
		that.loading.stop();
		Session.set('simple-s3__files-movable', false);
		Session.set('simple-s3__files-movable__current-moving-file', false);
	};

	that.folder = {};

	that.folder.getFoldersStringAsArray = function ( foldersString ) {
		var foldersArray = foldersString.match(/([^/.]+)/g) || ['/'];
		return ['/'].concat(foldersArray);
	};

	that.folder.create = function ( folderName ) {
		that.loading.showMessage('Creating '+folderName+'…');
		that.ui.disable();
		var directory = that.stringManip.getDirectoryWithoutLeadingSlash( that.filter.get('Directory') );
		Meteor.call("simpleS3/folderCreate", folderName, directory, function (err, res) {
			if (err) {
				that.errorMessages.newMessage( err.reason );
				throw Error(err);
			}
			that.bucketList.updateFromAWS();
			that.forms.resetAll();
		});
	};

	that.folder.delete = function ( key ) {
		var allItems = that.bucketList.get().Contents;
		that.ui.disable();
		var itemsToDelete = _( _(allItems).map( function( item ) {
			// Check if the root of the directory equals the selected directory
			var itemRootDir = item.Directory.substring(1, key.length+1);
			if ( itemRootDir === key && !item.SimpleS3ItemOnly )
				return item.Key;
		}) ).compact();
		that.file.deleteMany( itemsToDelete, 0 );
	};

	that.forms = {};

	that.forms.resetAll = function () {
		$('.simple-s3 form').trigger("reset");
		Session.set('simple-s3__show-upload-form', false);
		Session.set('simple-s3__show-create-folder-form', false);
	};

	that.ui = {};

	that.ui.disable = function () {
		Session.set('simple-s3__ui-enabled', false);
	};

	that.ui.enable = function () {
		Session.set('simple-s3__ui-enabled', true);
	};

	that.ui.enabledStatus = function() {
		return Session.get('simple-s3__ui-enabled');
	};

	that.ui.extrabuttons = {};

	that.ui.extrabuttons.add = function ( key, buttonText, cssClass ) {
		
		// User can add his/her own buttons to the UI
		if (!key || !buttonText || !cssClass)
			throw new Error('You must pass key, buttonText, cssClass to SimpleS3.ui.extrabuttons.add()!');
		
		// The current buttons
		var currentButtons = that.ui.extrabuttons.getAll();
		
		// Create the buttons object if there is none right now
		if (!currentButtons)
			currentButtons = {};

		// Create an array for the key if there is none
		if (!currentButtons[key])
			currentButtons[key] = [];

		// There should only be one button with the passed buttonText, so
		// if there are more, stop right here.
		if (_(currentButtons[key]).findWhere({ buttonText: buttonText }))
			return false;

		// Push the button to the buttons
		currentButtons[key].push({ buttonText: buttonText, cssClass: cssClass });

		// Update the Session
		return Session.set('simple-s3__ui__extra-buttons', currentButtons);

	};

	that.ui.extrabuttons.getAll = function () {
		return Session.get('simple-s3__ui__extra-buttons');
	};

	that.init = function () {
		Session.setDefault('simple-s3__bucket-items-list', SimpleS3.currentSortOrder);
	};

};

SimpleS3 = new SimpleS3Class();