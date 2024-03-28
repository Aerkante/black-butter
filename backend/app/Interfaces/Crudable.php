<?php

namespace App\Interfaces;

interface Crudable
{
    public function index();

    public function store();

    public function show(int $id);

    public function update(int $id);

    public function destroy(int $id);
}
