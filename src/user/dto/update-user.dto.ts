//export class UpdateUserDto extends PartialType(CreateUserDto) {}
import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from '@/user/dto/create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
