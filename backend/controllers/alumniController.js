// Alumni controller - handles alumni CRUD operations
const { AlumniService } = require('../services/alumniService');
const { success, list, error } = require('../utils/response');

class AlumniController {
  
  // GET /api/alumni
  static async getAll(req, res) {
    try {
      const { search, status, kategori, page, limit } = req.query;
      const result = await AlumniService.getFilteredAlumni(
        search, status, kategori, 
        parseInt(page) || 1, parseInt(limit) || 100
      );
      res.json(list(result.data, result.pagination));
    } catch (err) {
      res.status(500).json(error(err.message));
    }
  }
  
  // GET /api/alumni/:id/detail
  static async getDetail(req, res) {
    try {
      const { id } = req.params;
      const data = await AlumniService.getAlumniDetail(id);
      res.json(success(data));
    } catch (err) {
      if (err.message === 'Alumni tidak ditemukan') {
        res.status(404).json(error(err.message, 404));
      } else {
        res.status(500).json(error(err.message));
      }
    }
  }
  
  // POST /api/alumni
  static async create(req, res) {
    try {
      const data = await AlumniService.createAlumni(req.body);
      res.status(201).json(success(data, 'Alumni berhasil ditambahkan'));
    } catch (err) {
      res.status(500).json(error(err.message));
    }
  }
  
  // PUT /api/alumni/:id
  static async update(req, res) {
    try {
      const { id } = req.params;
      const alumni = await AlumniService.updateAlumni(id, req.body);
      res.json(success(alumni, 'Alumni berhasil diperbarui'));
    } catch (err) {
      res.status(500).json(error(err.message));
    }
  }
  
  // DELETE /api/alumni/:id
  static async delete(req, res) {
    try {
      const { id } = req.params;
      await AlumniService.deleteAlumni(id);
      res.json(success(null, 'Alumni berhasil dihapus'));
    } catch (err) {
      res.status(500).json(error(err.message));
    }
  }
}

module.exports = { AlumniController };