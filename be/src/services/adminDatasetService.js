const { db, FieldValue } = require("../config/firebase");

const ALLOWED = new Set(["hotels", "places", "restaurants"]);

const PLACE_FIELDS = [
    "name", "type", "province", "rating",
    "open_time", "close_time", "days_open",
    "description", "latitude", "longitude",
];

const RESTAURANT_FIELDS = [
    ...PLACE_FIELDS,
    "price_range", "best_for", "signature_dish",
];

const HOTEL_FIELDS = [
    "name", "type", "province", "rating", "star_rating",
    "description", "latitude", "longitude", "address",
    "check_in_time", "check_out_time", "days_open",
    "price_range", "room_types", "amenities", "phone_number",
];

function fieldsFor(collection) {
    if (collection === "places") return PLACE_FIELDS;
    if (collection === "restaurants") return RESTAURANT_FIELDS;
    if (collection === "hotels") return HOTEL_FIELDS;
    return null;
}

function throwHttp(statusCode, message) {
    const err = new Error(message);
    err.statusCode = statusCode;
    throw err;
}

function pickAllowed(collection, body) {
    const fields = fieldsFor(collection);
    if (!fields) throwHttp(400, "Invalid collection");

    const out = {};
    for (const k of fields) {
        if (body && Object.prototype.hasOwnProperty.call(body, k)) out[k] = body[k];
    }

    // normalize minimal required fields
    if (typeof out.name === "string") out.name = out.name.trim();
    if (typeof out.type === "string") out.type = out.type.trim();
    if (typeof out.province === "string") out.province = out.province.trim();

    // latitude/longitude if sent -> try to parse
    if (out.latitude != null && typeof out.latitude === "string") {
        const v = Number(out.latitude);
        out.latitude = Number.isFinite(v) ? v : out.latitude;
    }
    if (out.longitude != null && typeof out.longitude === "string") {
        const v = Number(out.longitude);
        out.longitude = Number.isFinite(v) ? v : out.longitude;
    }

    return out;
}

async function listByProvince(collection, province) {
    if (!ALLOWED.has(collection)) throwHttp(400, "Invalid collection");
    const normalizedProvince = String(province || "").trim();
    if (!normalizedProvince) throwHttp(400, "province is required");

    const snap = await db
        .collection(collection)
        .where("province", "==", normalizedProvince)
        .orderBy("createdAt", "desc")
        .get();

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getById(collection, id) {
    if (!ALLOWED.has(collection)) throwHttp(400, "Invalid collection");
    const doc = await db.collection(collection).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}

async function create(collection, body) {
    if (!ALLOWED.has(collection)) throwHttp(400, "Invalid collection");

    const data = pickAllowed(collection, body);

    // minimal required fields
    if (!data.name) throwHttp(400, "name is required");
    if (!data.province) throwHttp(400, "province is required");

    const now = FieldValue.serverTimestamp();
    const ref = await db.collection(collection).add({
        ...data,
        createdAt: now,
        updatedAt: now,
    });

    const created = await ref.get();
    return { id: created.id, ...created.data() };
}

async function update(collection, id, body) {
    if (!ALLOWED.has(collection)) throwHttp(400, "Invalid collection");

    const patch = pickAllowed(collection, body);
    if (Object.keys(patch).length === 0) throwHttp(400, "No valid fields to update");

    await db.collection(collection).doc(id).update({
        ...patch,
        updatedAt: FieldValue.serverTimestamp(),
    });

    return getById(collection, id);
}

async function remove(collection, id) {
    if (!ALLOWED.has(collection)) throwHttp(400, "Invalid collection");
    await db.collection(collection).doc(id).delete();
}

module.exports = { listByProvince, getById, create, update, remove };
