import { Employee } from "../models/employee.model.ts";
import {
  CreateEmployeeInput,
  EmployeeData,
  UpdateEmployeeInput,
} from "../interfaces/employee.dto.ts";

export class EmployeeRepository {
  private employee = Employee;

  async createEmployee(data: CreateEmployeeInput): Promise<EmployeeData> {
    return await this.employee.create(data);
  }

  async findAllEmployees(): Promise<EmployeeData[]> {
    return await this.employee.find();
  }

  async findEmployeeById(employeeId: string): Promise<EmployeeData | null> {
    return await this.employee.findById(employeeId);
  }

  async updateEmployee(
    employeeId: string,
    data: UpdateEmployeeInput,
  ): Promise<UpdateEmployeeInput | null> {
    return await this.employee.findByIdAndUpdate(employeeId, data, {
      new: true,
    });
  }

  async deleteEmployee(employeeId: string) {
    await this.employee.findByIdAndDelete(employeeId);
  }
}
