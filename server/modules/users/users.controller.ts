import { Controller, Post, Body, Res, HttpStatus, Get, Req, Query, Delete } from "@nestjs/common";
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

    @Post('create')
    async create(@Body() createUserDto: CreateUserDto) {
        console.log(`POST create :`, createUserDto);
        this.usersService.create(createUserDto);
    }

    @Get('create')
    async createGet(@Res() res, @Query() query/*@Body createUserDto: CreateUserDto*/): Promise<void> {
        // console.log(`Incoming request to create user: `, query);
        // let user: Partial<IUser> = {
        //     name: query.name,
        //     age: query.age,
        //     gender: query.gender
        // };
        // await this.usersService.create(user);
        console.log(`Error 'GET' for create user!`, HttpStatus[HttpStatus.METHOD_NOT_ALLOWED]);
        res.status(HttpStatus.METHOD_NOT_ALLOWED).send();
    }

    @Delete('deleteAll')
    async delete(@Res() res): Promise<void> {
        console.log(`Call delete all users!`);
        let deleteSuccess: boolean = await this.usersService.deleteAll();
        if (deleteSuccess) {
            console.log(`All users were deleted!`)
            res.status(HttpStatus.OK).send();
        } else {
            console.error(`No user exists to delete!`);
            res.status(HttpStatus.NOT_ACCEPTABLE).send();
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