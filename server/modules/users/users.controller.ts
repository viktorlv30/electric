import { Controller, Post, Body, Res, HttpStatus, Get, Req, Query } from "@nestjs/common";
import { UsersService } from "./users.service";
import { IUser } from "./interfaces/user.interface";

class CreateUserDto {
    name: string;
    age: number;
    gender: string;
}

@Controller('users')
export class UsersController {

    constructor(private readonly usersService: UsersService) { }

    @Get('create')
    async create(@Res() res, @Query() query/*@Body createUserDto: CreateUserDto*/): Promise<void> {
        console.log(`Incoming request to create user: `, query);
        let user: Partial<IUser> = {
            name: query.name,
            age: query.age,
            gender: query.gender
        };
        await this.usersService.create(user);
        console.log(`created user: `, user);
        res.status(HttpStatus.CREATED).send();
    }

    @Get('deleteAll')
    async delete(@Res() res, @Query() query/*@Body createUserDto: CreateUserDto*/): Promise<void> {
        console.log(`Delete all users: `, query);
        let deleteSuccess: boolean = await this.usersService.deleteAll();
        if (deleteSuccess) {
            res.status(HttpStatus.OK).send();
        } else {
            res.status(HttpStatus.EXPECTATION_FAILED).send();
        }
    }

    @Get('all')
    async findAll(): Promise<Partial<IUser>[]> {
        console.log(`Get all users: `);
        let users = await this.usersService.findAll();
        console.log(`Send users to client: `, JSON.stringify(users));
        return users;
    }
}