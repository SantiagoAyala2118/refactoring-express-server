import { Router } from "express";

import EmployeeControllers from "../controllers/employee.controller.ts";

const router = Router();
const controller = new EmployeeControllers();

router.post("/employees", controller.createEmployee);
router.get("/employees", controller.findAllEmployees);
router.get("/employees/:employeeId", controller.findEmployeeById);
router.put("/employees/:employeeId", controller.updateEmployee);
router.delete("/employees/:employeeId", controller.deleteEmployee);

export default router;
