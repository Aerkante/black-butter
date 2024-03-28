#########################
#   Development build   #
#########################
FROM php:8.2-fpm as development

WORKDIR /var/www

USER $user

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libpq-dev \
    libzip-dev \
    libssl-dev \
    zip \
    unzip \
    nodejs \ 
    npm \
    --no-install-recommends

# Install PHP extensions
RUN docker-php-ext-install pdo_pgsql mbstring exif pcntl bcmath gd pdo zip

# Get Composer
COPY --from=composer:2.6 /usr/bin/composer /usr/bin/composer

# Install redis
RUN pecl install -o -f redis && \
    docker-php-ext-enable redis

# Install php swoole
RUN pecl install -o -f swoole && \
    docker-php-ext-enable swoole

EXPOSE 9000

########################
#   Production build   #
########################
FROM php:8.2-fpm as production

WORKDIR /var/www

USER $user

ENV COMPOSER_ALLOW_SUPERUSER 1

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libpq-dev \
    libzip-dev \
    libssl-dev \
    zip \
    unzip \
    --no-install-recommends

# Install PHP extensions
RUN docker-php-ext-install pdo_pgsql mbstring exif pcntl bcmath gd pdo zip

# Get Composer
COPY --from=composer:2.6 /usr/bin/composer /usr/bin/composer
COPY --chown=www-data:www-data . /var/www

# Install redis
RUN pecl install -o -f redis && \
    docker-php-ext-enable redis

# Install php swoole
RUN pecl install -o -f swoole && \
    docker-php-ext-enable swoole

# Install all dependencies
RUN composer install --no-dev

# Remove unneeded packages
RUN apt-get purge -y git zip unzip && \
    apt-get autoremove -y

# Clear cache
RUN apt-get clean && \
    composer clear-cache && \
    rm -rf /var/lib/apt/lists/* /tmp/*

EXPOSE 9000

CMD ["php", "artisan", "octane:start", "--host=0.0.0.0"]
