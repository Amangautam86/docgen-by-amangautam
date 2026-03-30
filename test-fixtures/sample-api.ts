import { Router, Request, Response } from 'express';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
}

export interface DeleteResponse {
  success: boolean;
  deletedId: string;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export const userRouter = Router();

userRouter.get('/users', async (_req: Request, _res: Response): Promise<PaginatedResponse<User>> => {
  return { data: [], total: 0, page: 1, limit: 10 };
});

userRouter.post('/users', async (_req: Request<{}, {}, CreateUserDto>, _res: Response<User>): Promise<void> => {
  _res.json({} as User);
});

userRouter.put('/users/:id', async (_req: Request<{ id: string }, {}, UpdateUserDto>, _res: Response<User>): Promise<void> => {
  _res.json({} as User);
});

userRouter.delete('/users/:id', async (_req: Request<{ id: string }>, _res: Response<DeleteResponse>): Promise<void> => {
  _res.json({} as DeleteResponse);
});
