import type { Request, Response, NextFunction } from "express";
import EmployeeService from "../services/employee.service.ts";
import { BadRequestError } from "../errors/htttp-errors.ts";

class EmployeeControllers {
  private service: EmployeeService;

  constructor(service: EmployeeService = new EmployeeService()) {
    this.service = service;
  }

  createEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, position, baseSalary, yearsOfService, finalSalary } =
        req.body;
      const newEmployee = await this.service.createEmployee({
        name,
        position,
        baseSalary,
        yearsOfService,
        finalSalary,
      });

      return res.status(201).json({
        ok: true,
        message: "Empleado creado correctamente",
        employee: newEmployee,
      });
    } catch (err: any) {
      next(err);
    }
  };

  findAllEmployees = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const employees = await this.service.findAllEmplyees();
      return res.status(200).json({
        ok: true,
        message: "Empleados encontrados",
        employees,
      });
    } catch (err: any) {
      next(err);
    }
  };

  findEmployeeById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { employeeId } = req.params;

      if (typeof employeeId !== "string") {
        throw new BadRequestError("El id proporcionado no es valido");
      }

      const employee = await this.service.findEmployeeById(employeeId);
      return res.status(200).json({
        ok: true,
        message: "Empleado encontrado",
        employee,
      });
    } catch (err: any) {
      next(err);
    }
  };

  updateEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId } = req.params;

      if (typeof employeeId !== "string") {
        throw new BadRequestError("El id proporcionado no es valido");
      }
      const updatedUser = await this.service.updateEmployee(
        employeeId,
        req.body,
      );
      return res.status(200).json({
        ok: true,
        message: "Datos del empleado actualizados correctamente",
        updatedUser,
      });
    } catch (err) {
      next(err);
    }
  };

  deleteEmployee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId } = req.params;

      if (typeof employeeId !== "string") {
        throw new BadRequestError("El id proporcionado no es valido");
      }

      await this.service.deleteEmployee(employeeId);

      return res.status(204).json({
        ok: true,
        message: "Recurso eliminado correctamente",
      });
    } catch (err) {
      next(err);
    }
  };
}

export default EmployeeControllers;
