import { Employee } from "../models/employee.model.ts";

export interface EmployeeData {
  name: string;
  position: string;
  baseSalary: number;
  yearsOfService: number;
}

class EmployeeRepository {
  private employee = Employee;

  async createEmployee(data: EmployeeData): Promise<void> {
    await this.employee.create(data);
  }

  async findAllEmployees(): Promise<void> {
    await this.employee.find();
  }

  async findEmployeeById(id: string): Promise<void> {
    await this.employee.findById(id);
  }
}

export default EmployeeRepository;
