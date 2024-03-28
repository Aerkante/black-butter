<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Abstract\AbstractController;
use App\Models\Zone;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class ZoneController extends AbstractController
{
    protected Model|Builder $model;

    public function __construct(Zone $model)
    {
        $this->model = $model;
        parent::__construct($this->model);
    }
}
