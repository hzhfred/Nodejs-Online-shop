//nodejs built in
const fs = require('fs');

const deleteFile = (filePath) => {
    //unlink deletes a file.
    fs.unlink(filePath, (err)=> {
        if(err){
            throw (err);
        }
    })
}

exports.deleteFile = deleteFile;