<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Abstract\AbstractController;
use App\Models\District;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class DistrictController extends AbstractController
{
    protected Model|Builder $model;

    public function __construct(District $model)
    {
        $this->model = $model;
        parent::__construct($this->model);
    }

    function index()
    {
        $zoneId = request()->get('zone', false);
        $search = request()->get('search', false);

        if ($zoneId && is_int($zoneId) && $zoneId != 0)
            $this->model = $this->model->where('zone_id', $zoneId);
        else if ($zoneId && is_string($zoneId))
            $this->model = $this->model->whereHas('zone', function ($q) use ($zoneId) {
                $q->where('name', $zoneId);
            });

        return parent::index();
    }
}
