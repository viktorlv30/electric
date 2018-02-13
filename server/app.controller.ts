import { Get, Controller, Res, Req } from '@nestjs/common';

@Controller()
export class AppController {
    @Get()
    root(): string {
        console.log(`Hello app controller!`);
        return 'Hello';
    }
}
