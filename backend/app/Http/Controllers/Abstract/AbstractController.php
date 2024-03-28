<?php

namespace App\Http\Controllers\Abstract;

use App\Interfaces\Crudable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class AbstractController implements Crudable
{
    protected Model|Builder $model;

    public function __construct(Model $model)
    {
        $this->model = $model;
    }

    public function index()
    {
        return isset($_REQUEST['page']) ? $this->model->paginate($_REQUEST['limit']) : $this->model->get();
    }

    public function store()
    {
        $attributes = request()->all();
        $this->model->fill($attributes);
        $this->model->save();
        return $this->model;
    }

    public function show(int $id)
    {
        return $this->model->findOrFail($id);
    }

    public function update(int $id)
    {
        $attributes = request()->all();
        $instance = $this->model->findOrFail($id);
        $instance->fill($attributes);
        $instance->save();
        return $instance;

    }

    public function destroy(int $id)
    {
        $instance = $this->model->findOrFail($id);
        return $instance->delete();
    }
}
