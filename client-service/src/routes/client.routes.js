import { Router } from "express";
import {
  createClient,
  listClients,
  getClient,
  updateClient,
  archiveClient,
  restoreClient,
  getStats,
  addContact,
  removeContact,
  updateClientStats,
} from "../controllers/client.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import {
  validate,
  createClientSchema,
  updateClientSchema,
  addContactSchema,
  listClientsSchema,
} from "../utils/validation.js";

const router = Router();

// ── All routes below require a valid JWT ──────────────────────────────────────
router.use(protect);

// ── Stats (must come BEFORE /:id routes — otherwise "stats" is treated as an ID)
router.get("/stats", getStats);

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.get(   "/",    validate(listClientsSchema, "query"), listClients);
router.post(  "/",    validate(createClientSchema),         createClient);
router.get(   "/:id", getClient);
router.put(   "/:id", validate(updateClientSchema),         updateClient);
router.delete("/:id", archiveClient);   // Soft delete — archives, doesn't destroy

// ── Archive / Restore ─────────────────────────────────────────────────────────
router.post("/:id/restore", restoreClient);

// ── Contacts ──────────────────────────────────────────────────────────────────
router.post(  "/:id/contacts/:contactId", validate(addContactSchema), addContact);
router.delete("/:id/contacts/:contactId", removeContact);

export default router;