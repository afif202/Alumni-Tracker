// Centralized error handling middleware
const handleError = (err, req, res, next) => {
  console.error('Error:', err.message);
  
  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation Error', 
      details: err.message 
    });
  }
  
  // Database errors
  if (err.code === 'SQLITE_ERROR') {
    return res.status(500).json({ 
      error: 'Database Error', 
      details: 'Database operation failed' 
    });
  }
  
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal Server Error' 
  });
};

module.exports = { handleError };