<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Abstract\AbstractController;
use App\Models\Report;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class ReportController extends AbstractController
{
    protected Model|Builder $model;

    public function __construct(Report $model)
    {
        $this->model = $model;
        parent::__construct($this->model);
    }

    function index()
    {
        $search = request()->get('search', false);
        if ($search)
            $this->model = $this->model->where(fn($query) => $query
                ->where('register', 'ilike', "%{$search}%")
                ->orWhere('zone', 'ilike', "%{$search}%")
                ->orWhere('district', 'ilike', "%{$search}%")
            );
        
        return parent::index();
    }
}
