import EmployeeRepository from "../repository/employee.repository.ts";
import { EmployeeData } from "../repository/employee.repository.ts";

class EmployeeService {
  private repository: EmployeeRepository;

  constructor(repository: EmployeeRepository) {
    this.repository = repository;
  }

  async createEmployee(data: EmployeeData): Promise<void> {
    if (typeof data.baseSalary != "number" || data.baseSalary <= 0) {
      throw new Error(
        "El salario base del empleado debe ser un numero mayor a 0",
      );
    }

    const bonus = data.baseSalary * 0.02 * data.yearsOfService;
    const finalSalary = data.baseSalary + bonus;

    const user = await this.repository.createEmployee({
      name: data.name,
      position: data.name,
      baseSalary: finalSalary,
      yearsOfService: data.yearsOfService,
    });
    return user;
  }

  async findAllEmplyees(): Promise<void> {
    await this.repository.findAllEmployees();
  }

  async findEmployeeById(id: string) {
    await this.repository.findEmployeeById(id);
  }
}

export default EmployeeService;
