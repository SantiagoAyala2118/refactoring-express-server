import { BadRequestError, NotFoundError } from "../errors/htttp-errors.ts";
import { EmployeeRepository } from "../repository/employee.repository.ts";
import type {
  EmployeeData,
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from "../interfaces/employee.dto.ts";
import { notDeepEqual } from "assert";

class EmployeeService {
  private repository: EmployeeRepository;

  constructor(repository: EmployeeRepository = new EmployeeRepository()) {
    this.repository = repository;
  }

  async createEmployee(data: CreateEmployeeInput): Promise<EmployeeData> {
    if (
      !data.name ||
      !data.position ||
      data.baseSalary === undefined ||
      data.yearsOfService === undefined
    ) {
      throw new BadRequestError(
        "Los campos nombre, position, salario base, anios de servicio son obligatorios",
      );
    }

    if (typeof data.baseSalary != "number" || data.baseSalary <= 0) {
      throw new BadRequestError(
        "El salario base del empleado debe ser un numero mayor a 0",
      );
    }

    if (
      typeof data.yearsOfService !== "number" ||
      data.yearsOfService < 0 ||
      !Number.isInteger(data.yearsOfService)
    ) {
      throw new BadRequestError(
        "La antigüedad debe ser un entero mayor o igual a 0",
      );
    }

    const bonus = data.baseSalary * 0.02 * data.yearsOfService;
    const finalSalary = data.baseSalary + bonus;

    const user = await this.repository.createEmployee({
      name: data.name,
      position: data.position,
      baseSalary: data.baseSalary,
      yearsOfService: data.yearsOfService,
      finalSalary,
    });
    return user;
  }

  async findAllEmplyees(): Promise<EmployeeData[]> {
    const employees = await this.repository.findAllEmployees();
    if (!employees || employees.length === 0) {
      throw new BadRequestError("No hay empleados cargados aun");
    }
    return employees;
  }

  async findEmployeeById(employeeId: string): Promise<EmployeeData> {
    const employee = await this.repository.findEmployeeById(employeeId);
    if (!employee) {
      throw new NotFoundError(
        "El empleado que busca no existe o no se ha cargado aun",
      );
    }
    return employee;
  }

  async updateEmployee(
    employeeId: string,
    data: UpdateEmployeeInput,
  ): Promise<UpdateEmployeeInput | null> {
    const employee = await this.repository.findEmployeeById(employeeId);
    if (!employee) {
      throw new NotFoundError("El empleado que intenta actualizar no existe");
    }

    //* Nombre invalido
    if (data.name !== undefined && typeof data.name !== "string") {
      throw new BadRequestError("El nombre y/o la posicion son invalidos");
    }

    //* Posicion invalida
    if (data.position !== undefined && typeof data.position !== "string") {
      throw new BadRequestError("El nombre y/o la posicion son invalidos");
    }

    //* Salario valido
    if (
      data.baseSalary !== undefined &&
      (typeof data.baseSalary !== "number" || data.baseSalary <= 0)
    ) {
      throw new BadRequestError(
        "El salario base del empleado debe ser un numero mayor a 0",
      );
    }

    //* Salario final valido
    if (
      data.finalSalary !== undefined &&
      (typeof data.finalSalary !== "number" || data.finalSalary <= 0)
    ) {
      throw new BadRequestError(
        "El salario final debe ser un numero entero mayor a 0",
      );
    }

    //* Anios de servicio valido
    if (
      data.yearsOfService !== undefined &&
      (typeof data.yearsOfService !== "number" ||
        data.yearsOfService < 0 ||
        !Number.isInteger(data.yearsOfService))
    ) {
      throw new BadRequestError(
        "La antigüedad debe ser un entero mayor o igual a 0",
      );
    }

    const updatedEmployee = await this.repository.updateEmployee(
      employeeId,
      data,
    );

    return updatedEmployee;
  }

  async deleteEmployee(employeeId: string) {
    const employee = await this.repository.findEmployeeById(employeeId);
    if (!employee) {
      throw new NotFoundError(
        "El empleado que intenta eliminar no existe o ya ha sido eliminado",
      );
    }

    await this.repository.deleteEmployee(employeeId);
  }
}

export default EmployeeService;
