<?php
header("Content-type:text/html;charset=utf-8");
// comment out the following two lines when deployed to production
defined('YII_DEBUG') or define('YII_DEBUG', true);
defined('YII_ENV') or define('YII_ENV', 'dev');

require(__DIR__ . '/../vendor/autoload.php');
require(__DIR__ . '/../vendor/yiisoft/yii2/Yii.php');

$config = require(__DIR__ . '/../config/web.php');
function pr($var)
{
    $template = php_sapi_name() !== 'cli' ? '<pre>%s</pre>' : "\n%s\n";
    printf($template, print_r($var, true));
    exit;
}

(new yii\web\Application($config))->run();
