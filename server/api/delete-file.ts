import { promises as fs } from 'fs';
import path from 'path';

export default defineEventHandler(async (event) => {
  try {
    const { sampleId, siteId, fileType, formType = 'base' } = await readBody(event);

    if (!sampleId || !siteId || !fileType) {
      throw createError({
        statusCode: 400,
        message: 'Sample ID, Site ID, and File Type are required.'
      });
    }

    // Convert siteId and sampleId to strings
    const siteIdString = String(siteId);
    const sampleIdString = String(sampleId);

    const folderMap = { base: 'base', bio: 'bio', hab: 'hab' };
    const folderName = folderMap[formType] || 'base';
    const folderPath = path.join('/webshare/kyww_images', folderName, siteIdString, sampleIdString);

    // Determine file name based on type
    const extension = fileType === 'form' ? 'pdf' : 'png';
    const fileName = `${fileType}_${sampleIdString}.${extension}`;
    const filePath = path.join(folderPath, fileName);

    try {
      // Check if file exists before attempting to delete
      await fs.access(filePath);
      // Delete the file
      await fs.unlink(filePath);

      return {
        status: 200,
        message: 'File deleted successfully'
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, still return success
        return {
          status: 200,
          message: 'File not found but operation completed'
        };
      }
      throw error;
    }

  } catch (error) {
    console.error('Error deleting file:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to delete file'
    });
  }
});