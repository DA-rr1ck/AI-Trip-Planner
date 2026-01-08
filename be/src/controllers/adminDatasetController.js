const adminAuthService = require("../services/adminAuthService");
const adminDatasetService = require("../services/adminDatasetService");

const listByProvince = async (req, res) => {
    try {
        await adminAuthService.requireAdmin(req);

        const { collection } = req.params;
        const { province } = req.query;

        const items = await adminDatasetService.listByProvince(collection, province);
        return res.json({ items });
    } catch (e) {
        console.error(e);
        return res.status(e.statusCode || 500).json({ message: e.message || "Server error" });
    }
};

const getById = async (req, res) => {
    try {
        await adminAuthService.requireAdmin(req);

        const { collection, id } = req.params;
        const item = await adminDatasetService.getById(collection, id);
        if (!item) return res.status(404).json({ message: "Not found" });

        return res.json({ item });
    } catch (e) {
        console.error(e);
        return res.status(e.statusCode || 500).json({ message: e.message || "Server error" });
    }
};

const create = async (req, res) => {
    try {
        await adminAuthService.requireAdmin(req);

        const { collection } = req.params;
        const created = await adminDatasetService.create(collection, req.body);
        return res.status(201).json({ item: created });
    } catch (e) {
        console.error(e);
        return res.status(e.statusCode || 500).json({ message: e.message || "Server error" });
    }
};

const update = async (req, res) => {
    try {
        await adminAuthService.requireAdmin(req);

        const { collection, id } = req.params;
        const updated = await adminDatasetService.update(collection, id, req.body);
        return res.json({ item: updated });
    } catch (e) {
        console.error(e);
        return res.status(e.statusCode || 500).json({ message: e.message || "Server error" });
    }
};

const remove = async (req, res) => {
    try {
        await adminAuthService.requireAdmin(req);

        const { collection, id } = req.params;
        await adminDatasetService.remove(collection, id);
        return res.json({ ok: true });
    } catch (e) {
        console.error(e);
        return res.status(e.statusCode || 500).json({ message: e.message || "Server error" });
    }
};

module.exports = { listByProvince, getById, create, update, remove };
